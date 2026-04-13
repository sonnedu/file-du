import { Router } from 'express'
import { createReadStream } from 'fs'
import { stat, access } from 'fs/promises'
import mimeTypes from 'mime-types'
import { getFile, incrementDownloads } from '../lib/db.js'
import { getFilePath } from '../lib/storage.js'

const router = Router()

router.get('/:id', async (req, res) => {
  const file = await getFile(req.params.id)
  if (!file) return res.status(404).json({ error: 'File not found' })

  const filePath = getFilePath(file.storedName)
  try {
    await access(filePath)
  } catch {
    return res.status(404).json({ error: 'File missing on disk' })
  }

  incrementDownloads(req.params.id).catch(() => {})

  const fileStat = await stat(filePath)
  const fileSize = fileStat.size
  const contentType =
    file.mimeType || mimeTypes.lookup(file.storedName) || 'application/octet-stream'
  const disposition = `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
  const range = req.headers.range

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : fileSize - 1
    const chunkSize = end - start + 1

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Content-Disposition': disposition,
    })
    createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
    })
    createReadStream(filePath).pipe(res)
  }
})

export default router
