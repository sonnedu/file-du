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

// Ensure data directories exist before starting
ensureDirectories()

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'file-du-change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    httpOnly: true,
    sameSite: 'lax',
  },
}))

// ─── Body Parsers ─────────────────────────────────────────────────────────────
// Note: upload route uses formidable (bypass body-parser)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true,
}))

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/remote', remoteRouter)
app.use('/api/files', filesRouter)
app.use('/api/download', downloadRouter)
app.use('/api/share', shareRouter)
app.use('/api/public', publicRouter)

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
// All non-API routes → serve index.html (client-side routing)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
 ███████╗██╗██╗     ███████╗      ██████╗ ██╗   ██╗
 ██╔════╝██║██║     ██╔════╝      ██╔══██╗██║   ██║
 █████╗  ██║██║     █████╗   ████ ██║  ██║██║   ██║
 ██╔══╝  ██║██║     ██╔══╝        ██║  ██║██║   ██║
 ██║     ██║███████╗███████╗      ██████╔╝╚██████╔╝
 ╚═╝     ╚═╝╚══════╝╚══════╝      ╚═════╝  ╚═════╝

 🚀 Running on http://0.0.0.0:${PORT}
 📁 Data: ${process.env.DATA_DIR || './data'}
 🔐 Admin password: ${process.env.ADMIN_PASSWORD ? '(set via env)' : 'admin123 (default!)'}
`)
})
