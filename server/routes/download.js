import { Router } from 'express'
import { createReadStream, statSync, existsSync } from 'fs'
import mimeTypes from 'mime-types'
import { getFile, incrementDownloads } from '../lib/db.js'
import { getFilePath } from '../lib/storage.js'

const router = Router()

router.get('/:id', (req, res) => {
  const file = getFile(req.params.id)
  if (!file) return res.status(404).json({ error: 'File not found' })

  const filePath = getFilePath(file.storedName)
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' })

  incrementDownloads(req.params.id)

  const stat = statSync(filePath)
  const fileSize = stat.size
  const contentType = file.mimeType || mimeTypes.lookup(file.storedName) || 'application/octet-stream'
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
