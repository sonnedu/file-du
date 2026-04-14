import { Router } from 'express'
import {
  createJob,
  getJob,
  updateJob,
  addClient,
  removeClient,
  cancelJob,
} from '../lib/downloadManager.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody, remoteUrlSchema } from '../middleware/validate.js'
import { downloadHttp } from '../lib/downloaders/http.js'
import {
  initWebTorrent,
  isWebTorrentReady,
  downloadTorrent,
  downloadTorrentFromUrl,
} from '../lib/downloaders/torrent.js'

const router = Router()

// Initialize WebTorrent (if available) eagerly
initWebTorrent()

// ─── POST /api/remote ─────────────────────────────────────────────────────────
router.post('/', requireAuth, validateBody(remoteUrlSchema), async (req, res) => {
  const { url } = req.body

  const trimmedUrl = url.trim()
  const isMagnet = trimmedUrl.startsWith('magnet:')
  const isTorrent = /\.torrent(\?|$)/i.test(trimmedUrl) && trimmedUrl.startsWith('http')
  const type = isMagnet ? 'magnet' : isTorrent ? 'torrent' : 'http'

  if ((type === 'magnet' || type === 'torrent') && !isWebTorrentReady()) {
    return res
      .status(501)
      .json({ error: 'Magnet/BT support not available (WebTorrent failed to load)' })
  }

  const job = createJob(type, trimmedUrl)

  if (!job) {
    return res.status(429).json({ error: 'Too many concurrent downloads. Please try again later.' })
  }

  // Start download delegating to strategy
  if (type === 'magnet') {
    downloadTorrent(job, trimmedUrl).catch(err => {
      // Avoid overwriting already cleanly aborted status
      const extJob = getJob(job.id)
      if (extJob && extJob.status !== 'error') {
        updateJob(job.id, { status: 'error', error: err.message })
      }
    })
  } else if (type === 'torrent') {
    downloadTorrentFromUrl(job, trimmedUrl).catch(err => {
      const extJob = getJob(job.id)
      if (extJob && extJob.status !== 'error') {
        updateJob(job.id, { status: 'error', error: err.message })
      }
    })
  } else {
    downloadHttp(job, trimmedUrl).catch(err => {
      const extJob = getJob(job.id)
      if (extJob && extJob.status !== 'error') {
        updateJob(job.id, { status: 'error', error: err.message })
      }
    })
  }

  res.json({ jobId: job.id, type })
})

// ─── GET /api/remote/progress/:jobId ─────────────────────────────────────────
router.get('/progress/:jobId', requireAuth, (req, res) => {
  const { jobId } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const keepAlive = setInterval(() => {
    res.write(': ping\n\n')
  }, 20000)

  if (!addClient(jobId, res)) {
    res.write(`data: ${JSON.stringify({ status: 'error', error: 'Job not found' })}\n\n`)
    clearInterval(keepAlive)
    return res.end()
  }

  req.on('close', () => {
    clearInterval(keepAlive)
    removeClient(jobId, res)
  })
})

// ─── GET /api/remote/status/:jobId ──────────────────────────────────────────
router.get('/status/:jobId', requireAuth, (req, res) => {
  const job = getJob(req.params.jobId)
  if (!job) return res.status(404).json({ error: 'Job not found' })

  const payload = {
    jobId: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    total: job.total,
    downloaded: job.downloaded,
    error: job.error || null,
  }

  if (job.status === 'done' && job.fileRecord) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol
    const host = req.headers['x-forwarded-host'] || req.get('host')
    payload.shareUrl = `${proto}://${host}/share/${job.fileRecord.id}`
    payload.fileId = job.fileRecord.id
    payload.fileName = job.fileRecord.originalName
    payload.fileSize = job.fileRecord.size
  }

  res.json(payload)
})

// ─── POST /api/remote/cancel/:jobId ─────────────────────────────────────────
router.post('/cancel/:jobId', requireAuth, (req, res) => {
  const success = cancelJob(req.params.jobId)
  if (!success) {
    return res.status(400).json({ error: 'Job not found or already completed' })
  }
  res.json({ success: true })
})

// ─── GET /api/remote/jobs ─────────────────────────────────────────────────────
router.get('/jobs', (req, res) => {
  res.json({ message: 'Use /api/remote/progress/:jobId for status' })
})

export default router
