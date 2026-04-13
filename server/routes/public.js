import { Router } from 'express'
import { getFiles } from '../lib/db.js'

const router = Router()

router.get('/files', async (req, res) => {
  const { search = '', sortBy = 'uploadedAt', sortDir = 'desc' } = req.query
  const files = (await getFiles({ search, sortBy, sortDir })).map(f => ({
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
