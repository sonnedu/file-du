import { Router } from 'express'
import { createWriteStream } from 'fs'
import { rename, rm, mkdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import https from 'https'
import http from 'http'
import path from 'path'
import mimeTypes from 'mime-types'
import { nanoid } from 'nanoid'
import { UPLOADS_DIR, TEMP_DIR } from '../lib/storage.js'
import { addFile } from '../lib/db.js'
import { createJob, getJob, updateJob, addClient, removeClient } from '../lib/downloadManager.js'
import { requireAuth } from '../middleware/auth.js'


const router = Router()

// Attempt to load webtorrent - optional dependency
let WebTorrent = null
let wtClient = null

try {
  const mod = await import('webtorrent')
  WebTorrent = mod.default
  wtClient = new WebTorrent()
  console.log('[Remote] WebTorrent initialized - magnet/BT downloads available')
} catch (e) {
  console.warn('[Remote] WebTorrent unavailable, magnet/BT downloads disabled:', e.message)
}

// ─── POST /api/remote ─────────────────────────────────────────────────────────
// Submit a download job. Returns jobId immediately, download runs in background.
router.post('/', requireAuth, async (req, res) => {
  const { url } = req.body
  if (!url?.trim()) return res.status(400).json({ error: 'URL is required' })

  const trimmedUrl = url.trim()
  const isMagnet = trimmedUrl.startsWith('magnet:')
  const isTorrent = /\.torrent(\?|$)/i.test(trimmedUrl) && trimmedUrl.startsWith('http')
  const type = isMagnet ? 'magnet' : isTorrent ? 'torrent' : 'http'

  if ((type === 'magnet' || type === 'torrent') && !wtClient) {
    return res.status(501).json({ error: 'Magnet/BT support not available (WebTorrent failed to load)' })
  }

  const job = createJob(type, trimmedUrl)

  // Start download in background (non-blocking)
  if (type === 'magnet') {
    downloadTorrent(job, trimmedUrl).catch(err => updateJob(job.id, { status: 'error', error: err.message }))
  } else if (type === 'torrent') {
    // First fetch the .torrent file, then pass to webtorrent
    downloadTorrentFromUrl(job, trimmedUrl).catch(err => updateJob(job.id, { status: 'error', error: err.message }))
  } else {
    downloadHttp(job, trimmedUrl).catch(err => updateJob(job.id, { status: 'error', error: err.message }))
  }

  res.json({ jobId: job.id, type })
})

// ─── GET /api/remote/progress/:jobId ─────────────────────────────────────────
// SSE stream for job progress
router.get('/progress/:jobId', requireAuth, (req, res) => {
  const { jobId } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')  // nginx: disable buffering
  res.flushHeaders()

  // Keep-alive comment every 20s to prevent proxy timeout
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n')
  }, 20000)

  if (!addClient(jobId, res)) {
    res.write(`data: ${JSON.stringify({ status: 'error', error: 'Job not found' })}\n\n`)
    clearInterval(keepAlive)
    return res.end()
  }

  req.on('close', () => {
    clearInterval(keepAlive)
    removeClient(jobId, res)
  })
})

// ─── GET /api/remote/jobs ─────────────────────────────────────────────────────
// List active jobs (optional, useful for reconnecting)
router.get('/jobs', (req, res) => {
  // Only return job IDs - client reconnects via SSE
  res.json({ message: 'Use /api/remote/progress/:jobId for status' })
})

// ═════════════════════════════════════════════════════════════════════════════
// HTTP Download
// ═════════════════════════════════════════════════════════════════════════════
async function downloadHttp(job, url, maxRedirects = 5) {
  updateJob(job.id, { status: 'downloading' })

  if (maxRedirects <= 0) {
    updateJob(job.id, { status: 'error', error: 'Too many redirects' })
    return
  }

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http

    const request = protocol.get(url, { headers: { 'User-Agent': 'file-du/1.0' } }, async (response) => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        request.destroy()
        const redirectUrl = new URL(response.headers.location, url).href
        return downloadHttp(job, redirectUrl, maxRedirects - 1).then(resolve).catch(reject)
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
      }

      const id = nanoid(10)
      // Try to get filename from Content-Disposition or URL
      let originalName = getFilenameFromHeaders(response.headers) || path.basename(parsedUrl.pathname) || `download_${id}`
      if (!originalName || originalName === '/') originalName = `download_${id}`

      const ext = path.extname(originalName)
      const storedName = `${id}${ext}`
      const destPath = path.join(UPLOADS_DIR, storedName)

      const total = parseInt(response.headers['content-length'] || '0', 10)
      let downloaded = 0
      let lastTime = Date.now()
      let lastBytes = 0

      updateJob(job.id, { total, downloaded: 0 })

      const writer = createWriteStream(destPath)

      response.on('data', chunk => {
        downloaded += chunk.length
        const now = Date.now()
        const elapsed = (now - lastTime) / 1000
        if (elapsed >= 0.5) {
          const speed = (downloaded - lastBytes) / elapsed
          const remaining = total > 0 ? (total - downloaded) / Math.max(speed, 1) : 0
          updateJob(job.id, {
            downloaded,
            progress: total > 0 ? (downloaded / total) * 100 : 0,
            speed: Math.round(speed),
            eta: Math.round(remaining),
          })
          lastTime = now
          lastBytes = downloaded
        }
      })

      response.pipe(writer)

      writer.on('finish', async () => {
        try {
          const fileStat = await stat(destPath)
          const record = {
            id,
            originalName,
            storedName,
            size: fileStat.size,
            mimeType: response.headers['content-type']?.split(';')[0].trim()
              || mimeTypes.lookup(originalName)
              || 'application/octet-stream',
            source: 'remote',
            sourceUrl: url,
            uploadedAt: new Date().toISOString(),
            downloads: 0,
          }
          addFile(record)
          updateJob(job.id, { status: 'done', progress: 100, fileRecord: record })
          resolve()
        } catch (err) {
          reject(err)
        }
      })

      writer.on('error', reject)
      response.on('error', reject)
    })

    request.on('error', reject)
    request.setTimeout(30000, () => {
      request.destroy(new Error('Connection timeout'))
    })
  })
}

function getFilenameFromHeaders(headers) {
  const cd = headers['content-disposition']
  if (!cd) return null
  const match = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i)
  return match ? decodeURIComponent(match[1]) : null
}

// ═════════════════════════════════════════════════════════════════════════════
// Torrent URL → Download .torrent file first, then use WebTorrent
// ═════════════════════════════════════════════════════════════════════════════
async function downloadTorrentFromUrl(job, torrentUrl) {
  // Download the .torrent file to temp
  const tempPath = path.join(TEMP_DIR, `${job.id}.torrent`)
  await downloadToFile(torrentUrl, tempPath)
  await downloadTorrent(job, tempPath, true)
}

async function downloadToFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    const writer = createWriteStream(destPath)
    protocol.get(url, { headers: { 'User-Agent': 'file-du/1.0' } }, response => {
      response.pipe(writer)
      writer.on('finish', resolve)
      writer.on('error', reject)
      response.on('error', reject)
    }).on('error', reject)
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// Magnet / Torrent Download via WebTorrent
// ═════════════════════════════════════════════════════════════════════════════
async function downloadTorrent(job, magnetOrPath, isTempFile = false) {
  if (!wtClient) throw new Error('WebTorrent not available')

  updateJob(job.id, { status: 'downloading' })

  const torrentDir = path.join(TEMP_DIR, job.id)
  await mkdir(torrentDir, { recursive: true })

  return new Promise((resolve, reject) => {
    wtClient.add(magnetOrPath, { path: torrentDir }, torrent => {
      updateJob(job.id, { total: torrent.length })

      torrent.on('download', () => {
        updateJob(job.id, {
          downloaded: torrent.downloaded,
          progress: Math.round(torrent.progress * 1000) / 10,
          speed: Math.round(torrent.downloadSpeed),
          eta: torrent.timeRemaining ? Math.round(torrent.timeRemaining / 1000) : 0,
        })
      })

      torrent.on('done', async () => {
        try {
          const results = []
          for (const file of torrent.files) {
            const id = nanoid(10)
            const ext = path.extname(file.name)
            const storedName = `${id}${ext}`
            const srcPath = path.join(torrentDir, file.path)
            const destPath = path.join(UPLOADS_DIR, storedName)

            // Move file to uploads
            try {
              await rename(srcPath, destPath)
            } catch {
              // Cross-device: copy then delete
              await copyFile(srcPath, destPath)
            }

            const fileStat = await stat(destPath)
            const record = {
              id,
              originalName: file.name,
              storedName,
              size: fileStat.size,
              mimeType: mimeTypes.lookup(file.name) || 'application/octet-stream',
              source: 'torrent',
              sourceUrl: job.url,
              uploadedAt: new Date().toISOString(),
              downloads: 0,
            }
            addFile(record)
            results.push(record)
          }

          // Cleanup
          torrent.destroy()
          if (isTempFile) {
            try { await rm(magnetOrPath) } catch {}
          }
          try { await rm(torrentDir, { recursive: true, force: true }) } catch {}

          updateJob(job.id, {
            status: 'done',
            progress: 100,
            fileRecord: results[0] || null,
            fileCount: results.length,
          })
          resolve()
        } catch (err) {
          reject(err)
        }
      })

      torrent.on('error', err => {
        torrent.destroy()
        reject(err)
      })
    })
  })
}

async function copyFile(src, dest) {
  const { createReadStream: crs } = await import('fs')
  const reader = crs(src)
  const writer = createWriteStream(dest)
  return new Promise((resolve, reject) => {
    reader.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
    reader.on('error', reject)
  })
}

export default router
