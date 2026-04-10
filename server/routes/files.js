import { Router } from 'express'
import { getFiles, getFile, updateFile, deleteFile } from '../lib/db.js'
import { deleteStoredFile } from '../lib/storage.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get('/', (req, res) => {
  const { search = '', sortBy = 'uploadedAt', sortDir = 'desc' } = req.query
  const files = getFiles({ search, sortBy, sortDir })
  res.json({ files })
})

router.patch('/:id', (req, res) => {
  const { id } = req.params
  const { originalName } = req.body

  if (!originalName?.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }

  const file = updateFile(id, { originalName: originalName.trim() })
  if (!file) return res.status(404).json({ error: 'File not found' })
  res.json({ success: true, file })
})

router.delete('/:id', (req, res) => {
  const { id } = req.params
  const file = getFile(id)
  if (!file) return res.status(404).json({ error: 'File not found' })

  deleteStoredFile(file.storedName)
  deleteFile(id)
  res.json({ success: true })
})

export default router
