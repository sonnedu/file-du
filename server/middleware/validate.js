import { z } from 'zod'

const renameSchema = z.object({
  originalName: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name too long')
    .refine(
      name => !/[<>:"/\\|?*]/.test(name) && !name.includes('\x00'),
      'Invalid characters in name'
    ),
})

const remoteUrlSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL too long')
    .refine(
      url => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('magnet:'),
      'URL must start with http://, https://, or magnet:'
    ),
})

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.errors[0]?.message || 'Validation error' })
    }
    req.body = result.data
    next()
  }
}

export { renameSchema, remoteUrlSchema }
