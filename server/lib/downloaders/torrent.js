import path from 'path'
import { rename, rm, mkdir, stat } from 'fs/promises'
import mimeTypes from 'mime-types'
import { nanoid } from 'nanoid'
import { UPLOADS_DIR, TEMP_DIR } from '../storage.js'
import { addFile, getTotalSize } from '../db.js'
import { updateJob } from '../downloadManager.js'
import { parseSize } from '../parseSize.js'
import { downloadToFile } from './http.js'

let WebTorrent = null
let wtClient = null

export async function initWebTorrent() {
  if (wtClient) return true
  try {
    const mod = await import('webtorrent')
    WebTorrent = mod.default
    // Add maxConns to protect server resources
    wtClient = new WebTorrent({ maxConns: 50, dht: true })
    console.log('[Remote] WebTorrent initialized - magnet/BT downloads available')
    return true
  } catch (e) {
    console.warn('[Remote] WebTorrent unavailable, magnet/BT downloads disabled:', e.message)
    return false
  }
}

export function isWebTorrentReady() {
  return !!wtClient
}

export async function downloadTorrentFromUrl(job, torrentUrl) {
  const tempPath = path.join(TEMP_DIR, `${job.id}.torrent`)
  // Download the .torrent file to temp
  await downloadToFile(torrentUrl, tempPath, job.abortController?.signal)
  if (job.abortController?.signal?.aborted) {
    return // Exited early
  }
  await downloadTorrent(job, tempPath, true)
}

export async function downloadTorrent(job, magnetOrPath, isTempFile = false) {
  if (!wtClient) throw new Error('WebTorrent not available')

  updateJob(job.id, { status: 'downloading' })

  // Early abort check
  if (job.abortController?.signal?.aborted) {
    updateJob(job.id, { status: 'error', error: 'Cancelled by user' })
    if (isTempFile) {
      try {
        await rm(magnetOrPath)
      } catch {
        /* ignore */
      }
    }
    return
  }

  const torrentDir = path.join(TEMP_DIR, job.id)
  await mkdir(torrentDir, { recursive: true })

  return new Promise((resolve, reject) => {
    let activeTorrent = null

    const cleanupTemp = async () => {
      if (isTempFile) {
        try {
          await rm(magnetOrPath)
        } catch {
          /* ignore */
        }
      }
      try {
        await rm(torrentDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }

    const onAbort = async () => {
      if (activeTorrent) activeTorrent.destroy()
      await cleanupTemp()
      reject(new Error('Cancelled by user'))
    }

    const signal = job.abortController?.signal
    if (signal) {
      signal.addEventListener('abort', onAbort)
    }

    wtClient.add(magnetOrPath, { path: torrentDir }, async torrent => {
      activeTorrent = torrent

      const MAX_TOTAL_SIZE = parseSize(process.env.MAX_TOTAL_SIZE || '50GB')
      if ((await getTotalSize()) + torrent.length > MAX_TOTAL_SIZE) {
        torrent.destroy()
        if (signal) signal.removeEventListener('abort', onAbort)
        await cleanupTemp()
        return reject(new Error('Storage quota exceeded (MAX_TOTAL_SIZE limit)'))
      }

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
        if (signal) signal.removeEventListener('abort', onAbort)

        try {
          const results = []
          for (const file of torrent.files) {
            const id = nanoid(10)
            const ext = path.extname(file.name)
            const storedName = `${id}${ext}`
            const srcPath = path.join(torrentDir, file.path)
            const destPath = path.join(UPLOADS_DIR, storedName)

            try {
              await rename(srcPath, destPath)
            } catch {
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
            await addFile(record)
            results.push(record)
          }

          torrent.destroy()
          await cleanupTemp()

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
        if (signal) signal.removeEventListener('abort', onAbort)
        torrent.destroy()
        cleanupTemp().finally(() => reject(err))
      })
    })
  })
}

async function copyFile(src, dest) {
  const { createReadStream: crs } = await import('fs')
  const { createWriteStream: cws } = await import('fs')
  const reader = crs(src)
  const writer = cws(dest)
  return new Promise((resolve, reject) => {
    reader.pipe(writer)
    writer.on('finish', resolve)
    writer.on('error', reject)
    reader.on('error', reject)
  })
}
