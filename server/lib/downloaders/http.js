import fs from 'fs'
import { rm, stat } from 'fs/promises'
import https from 'https'
import http from 'http'
import path from 'path'
import mimeTypes from 'mime-types'
import { nanoid } from 'nanoid'
import { UPLOADS_DIR } from '../storage.js'
import { addFile, getTotalSize } from '../db.js'
import { updateJob } from '../downloadManager.js'
import { parseSize } from '../parseSize.js'
import dns from 'dns'
import ipaddr from 'ipaddr.js'

function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err)
    try {
      const ip = ipaddr.parse(address)
      const range = ip.range()
      if (range !== 'unicast' && range !== 'ipv4Mapped') {
        return callback(
          new Error(`SSRF Prevention: IP ${address} is in a restricted range (${range})`)
        )
      }
      callback(null, address, family)
    } catch {
      callback(new Error('Invalid IP address resolved'))
    }
  })
}

export const safeHttpAgent = new http.Agent({ lookup: safeLookup })
export const safeHttpsAgent = new https.Agent({ lookup: safeLookup })

export async function downloadHttp(job, url, maxRedirects = 5) {
  updateJob(job.id, { status: 'downloading' })

  if (maxRedirects <= 0) {
    updateJob(job.id, { status: 'error', error: 'Too many redirects' })
    return
  }

  // Early exit if already cancelled
  if (job.abortController?.signal?.aborted) {
    updateJob(job.id, { status: 'error', error: 'Cancelled by user' })
    return
  }

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    const agent = parsedUrl.protocol === 'https:' ? safeHttpsAgent : safeHttpAgent

    const options = {
      agent,
      headers: { 'User-Agent': 'file-du/1.0' },
      signal: job.abortController?.signal,
    }

    const request = protocol.get(url, options, async response => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        request.destroy()
        const redirectUrl = new URL(response.headers.location, url).href
        return downloadHttp(job, redirectUrl, maxRedirects - 1)
          .then(resolve)
          .catch(reject)
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
      }

      const id = nanoid(10)
      let originalName =
        getFilenameFromHeaders(response.headers) ||
        path.basename(parsedUrl.pathname) ||
        `download_${id}`
      if (!originalName || originalName === '/') originalName = `download_${id}`

      const ext = path.extname(originalName)
      const storedName = `${id}${ext}`
      const destPath = path.join(UPLOADS_DIR, storedName)

      const total = parseInt(response.headers['content-length'] || '0', 10)

      const MAX_TOTAL_SIZE = parseSize(process.env.MAX_TOTAL_SIZE || '50GB')
      if ((await getTotalSize()) + total > MAX_TOTAL_SIZE) {
        request.destroy(new Error('Storage quota exceeded (MAX_TOTAL_SIZE limit)'))
        return reject(new Error('Storage quota exceeded'))
      }

      let downloaded = 0
      let lastTime = Date.now()
      let lastBytes = 0

      // Init job
      updateJob(job.id, { total, downloaded: 0 })

      const writer = fs.createWriteStream(destPath)

      const signal = job.abortController?.signal
      let manualAbort = false

      // Fallback manual abort cleanup in addition to request signals
      const onAbort = async () => {
        manualAbort = true
        request.destroy()
        writer.destroy()
        try {
          await rm(destPath, { force: true })
        } catch {
          // ignore
        }
        reject(new Error('Cancelled by user'))
      }

      if (signal) {
        signal.addEventListener('abort', onAbort)
      }

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
        if (manualAbort) return
        if (signal) signal.removeEventListener('abort', onAbort)

        try {
          const fileStat = await stat(destPath)
          const record = {
            id,
            originalName,
            storedName,
            size: fileStat.size,
            mimeType:
              response.headers['content-type']?.split(';')[0].trim() ||
              mimeTypes.lookup(originalName) ||
              'application/octet-stream',
            source: 'remote',
            sourceUrl: url,
            uploadedAt: new Date().toISOString(),
            downloads: 0,
          }
          await addFile(record)
          updateJob(job.id, { status: 'done', progress: 100, fileRecord: record })
          resolve()
        } catch (err) {
          reject(err)
        }
      })

      writer.on('error', err => {
        if (signal) signal.removeEventListener('abort', onAbort)
        reject(err)
      })
      response.on('error', err => {
        if (signal) signal.removeEventListener('abort', onAbort)
        reject(err)
      })
    })

    request.on('error', err => {
      if (err.name === 'AbortError') {
        reject(new Error('Cancelled by user'))
      } else {
        reject(err)
      }
    })

    // Simple connect timeout watcher
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

export async function downloadToFile(url, destPath, abortSignal) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const protocol = parsedUrl.protocol === 'https:' ? https : http
    const agent = parsedUrl.protocol === 'https:' ? safeHttpsAgent : safeHttpAgent

    const writer = fs.createWriteStream(destPath)
    let manualAbort = false

    const cleanup = async () => {
      writer.destroy()
      try {
        await rm(destPath, { force: true })
      } catch {
        // ignore
      }
    }

    const onAbort = async () => {
      manualAbort = true
      await cleanup()
      reject(new Error('Cancelled by user'))
    }

    if (abortSignal) {
      abortSignal.addEventListener('abort', onAbort)
    }

    const options = {
      agent,
      headers: { 'User-Agent': 'file-du/1.0' },
      signal: abortSignal,
    }

    protocol
      .get(url, options, response => {
        response.pipe(writer)
        writer.on('finish', () => {
          if (manualAbort) return
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort)
          resolve()
        })
        writer.on('error', err => {
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort)
          reject(err)
        })
        response.on('error', err => {
          if (abortSignal) abortSignal.removeEventListener('abort', onAbort)
          reject(err)
        })
      })
      .on('error', err => {
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort)
        if (err.name === 'AbortError') {
          cleanup().finally(() => reject(new Error('Cancelled by user')))
        } else {
          reject(err)
        }
      })
  })
}
