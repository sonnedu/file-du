import { Router } from 'express'
import rateLimit from 'express-rate-limit'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: '请求过于频繁，请 15 分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/login', loginLimiter, (req, res) => {
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
