import { Router } from 'express'
import formidable from 'formidable'
import { rename } from 'fs/promises'
import path from 'path'
import mimeTypes from 'mime-types'
import { nanoid } from 'nanoid'
import { UPLOADS_DIR } from '../lib/storage.js'
import { addFile, getTotalSize } from '../lib/db.js'
import { requireAuth } from '../middleware/auth.js'
import { parseSize } from '../lib/parseSize.js'

const router = Router()
const MAX_FILE_SIZE = parseSize(process.env.MAX_FILE_SIZE || '8GB')

router.post('/', requireAuth, async (req, res) => {
  const MAX_TOTAL_SIZE = parseSize(process.env.MAX_TOTAL_SIZE || '50GB')
  const incomingSize = parseInt(req.headers['content-length'] || '0', 10)
  if ((await getTotalSize()) + incomingSize > MAX_TOTAL_SIZE) {
    return res.status(413).json({ error: 'Storage quota exceeded (MAX_TOTAL_SIZE limit)' })
  }

  const form = formidable({
    uploadDir: UPLOADS_DIR,
    maxFileSize: MAX_FILE_SIZE,
    multiples: true,
  })

  try {
    const [, files] = await form.parse(req)
    const uploadedFiles = Object.values(files).flat()

    if (!uploadedFiles.length) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const results = []
    for (const file of uploadedFiles) {
      const id = nanoid(10)
      const originalName = file.originalFilename || `file_${id}`
      const ext = path.extname(originalName)
      const storedName = `${id}${ext}`
      const destPath = path.join(UPLOADS_DIR, storedName)

      await rename(file.filepath, destPath)

      const record = {
        id,
        originalName,
        storedName,
        size: file.size,
        mimeType: file.mimetype || mimeTypes.lookup(originalName) || 'application/octet-stream',
        source: 'upload',
        uploadedAt: new Date().toISOString(),
        downloads: 0,
      }
      await addFile(record)
      results.push(record)
    }

    res.json({ success: true, files: results })
  } catch (err) {
    console.error('[Upload Error]', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
