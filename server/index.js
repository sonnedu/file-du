import './startup-check.js'

import express from 'express'
import session from 'express-session'
import { fileURLToPath } from 'url'
import path from 'path'
import { ensureDirectories } from './lib/storage.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import remoteRouter from './routes/remote.js'
import filesRouter from './routes/files.js'
import downloadRouter from './routes/download.js'
import shareRouter from './routes/share.js'
import publicRouter from './routes/public.js'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

ensureDirectories()

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
  },
}))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))

app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true,
}))

app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/remote', remoteRouter)
app.use('/api/files', filesRouter)
app.use('/api/download', downloadRouter)
app.use('/api/share', shareRouter)
app.use('/api/public', publicRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ File-Du running on http://0.0.0.0:${PORT}\n   Data directory: ${process.env.DATA_DIR || './data'}\n`)
})
