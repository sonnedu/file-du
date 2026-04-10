import { Router } from 'express'
import { getFiles } from '../lib/db.js'

const router = Router()

// Public file list (no auth required)
// Only exposes safe fields, omits storedName
router.get('/files', (req, res) => {
  const { search = '', sortBy = 'uploadedAt', sortDir = 'desc' } = req.query
  const files = getFiles({ search, sortBy, sortDir }).map(f => ({
    id: f.id,
    originalName: f.originalName,
    size: f.size,
    mimeType: f.mimeType,
    source: f.source,
    uploadedAt: f.uploadedAt,
    downloads: f.downloads,
  }))
  res.json({ files })
})

export default router
