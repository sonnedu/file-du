import { Router } from 'express'
import { getFiles, getFile, updateFile, deleteFile } from '../lib/db.js'
import { deleteStoredFile } from '../lib/storage.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody, renameSchema } from '../middleware/validate.js'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  const { search = '', sortBy = 'uploadedAt', sortDir = 'desc' } = req.query
  const files = await getFiles({ search, sortBy, sortDir })
  res.json({ files })
})

router.patch('/:id', validateBody(renameSchema), async (req, res) => {
  const { id } = req.params
  const { originalName } = req.body

  const file = await updateFile(id, { originalName: originalName.trim() })
  if (!file) return res.status(404).json({ error: 'File not found' })
  res.json({ success: true, file })
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  const file = await getFile(id)
  if (!file) return res.status(404).json({ error: 'File not found' })

  await deleteStoredFile(file.storedName)
  await deleteFile(id)
  res.json({ success: true })
})

export default router
