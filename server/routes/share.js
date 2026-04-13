import { Router } from 'express'
import { getFile } from '../lib/db.js'

const router = Router()

router.get('/:id', async (req, res) => {
  const file = await getFile(req.params.id)
  if (!file) return res.status(404).json({ error: 'File not found' })

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
