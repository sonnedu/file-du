import { Router } from 'express'

const router = Router()

router.post('/login', (req, res) => {
  const { password } = req.body
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'

  if (password === adminPassword) {
    req.session.authenticated = true
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Session error' })
      return res.json({ success: true })
    })
  } else {
    return res.status(401).json({ error: 'Invalid password' })
  }
})

router.post('/logout', (req, res) => {
  req.session.destroy()
  res.json({ success: true })
})

router.get('/status', (req, res) => {
  res.json({ authenticated: !!(req.session?.authenticated) })
})

export default router
