import { Router } from 'express'
import { getFile } from '../lib/db.js'

const router = Router()

// Public endpoint - returns file metadata for share page
router.get('/:id', (req, res) => {
  const file = getFile(req.params.id)
  if (!file) return res.status(404).json({ error: 'File not found' })

  // Only expose safe metadata (not storedName for security)
  res.json({
    id: file.id,
    originalName: file.originalName,
    size: file.size,
    mimeType: file.mimeType,
    source: file.source,
    sourceUrl: file.source === 'upload' ? undefined : file.sourceUrl,
    uploadedAt: file.uploadedAt,
    downloads: file.downloads,
  })
})

export default router
