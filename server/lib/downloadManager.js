const jobs = new Map()
let _counter = 0

const DOWNLOAD_TIMEOUT_MS = parseInt(process.env.DOWNLOAD_TIMEOUT_MS || '') || 2 * 60 * 60 * 1000
const MAX_CONCURRENT_DOWNLOADS = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '') || 10

export function createJob(type, url) {
  if (getActiveJobCount() >= MAX_CONCURRENT_DOWNLOADS) {
    return null
  }

  const id = `job_${Date.now()}_${++_counter}`
  const job = {
    id,
    type,
    url,
    status: 'pending',
    progress: 0,
    speed: 0,
    eta: 0,
    total: 0,
    downloaded: 0,
    error: null,
    fileRecord: null,
    clients: new Set(),
    createdAt: Date.now(),
    abortController: new AbortController(),
  }
  jobs.set(id, job)
  return job
}

export function getJob(id) {
  return jobs.get(id) || null
}

export function updateJob(id, updates) {
  const job = jobs.get(id)
  if (!job) return
  Object.assign(job, updates)
  broadcastJob(job)
}

export function cancelJob(id) {
  const job = jobs.get(id)
  if (!job) return false
  if (job.status !== 'pending' && job.status !== 'downloading') return false

  job.abortController?.abort()
  job.status = 'error'
  job.error = 'Cancelled by user'
  broadcastJob(job)
  return true
}

export function getActiveJobCount() {
  let count = 0
  for (const job of jobs.values()) {
    if (job.status === 'pending' || job.status === 'downloading') {
      count++
    }
  }
  return count
}

function broadcastJob(job) {
  const payload = JSON.stringify({
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    total: job.total,
    downloaded: job.downloaded,
    error: job.error,
    fileRecord: job.fileRecord,
  })
  for (const res of job.clients) {
    try {
      res.write(`data: ${payload}\n\n`)
    } catch {
      job.clients.delete(res)
    }
  }
}

export function addClient(jobId, res) {
  const job = jobs.get(jobId)
  if (!job) return false
  job.clients.add(res)
  const payload = JSON.stringify({
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    total: job.total,
    downloaded: job.downloaded,
    error: job.error,
    fileRecord: job.fileRecord,
  })
  res.write(`data: ${payload}\n\n`)
  return true
}

export function removeClient(jobId, res) {
  const job = jobs.get(jobId)
  if (job) job.clients.delete(res)
}

setInterval(() => {
  const now = Date.now()
  for (const [id, job] of jobs) {
    if (job.status === 'downloading' && now - job.createdAt > DOWNLOAD_TIMEOUT_MS) {
      job.abortController?.abort()
      job.status = 'error'
      job.error = 'Download timeout exceeded'
      broadcastJob(job)
    }

    if ((job.status === 'done' || job.status === 'error') && job.clients.size === 0) {
      const ts = parseInt(id.split('_')[1])
      if (ts < now - 60 * 60 * 1000) {
        jobs.delete(id)
      }
    }
  }
}, 60 * 1000)
