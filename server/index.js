import './startup-check.js'

import express from 'express'
import session from 'express-session'
import { fileURLToPath } from 'url'
import path from 'path'
import pino from 'pino'
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

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
})

ensureDirectories()

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))

app.use(
  express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',
    etag: true,
  })
)

app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/remote', remoteRouter)
app.use('/api/files', filesRouter)
app.use('/api/download', downloadRouter)
app.use('/api/share', shareRouter)
app.use('/api/public', publicRouter)

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', time: new Date().toISOString(), uptime: process.uptime() })
)

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error')
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`File-Du running on http://0.0.0.0:${PORT}`)
  logger.info(`Data directory: ${process.env.DATA_DIR || './data'}`)
})

export { logger }
