/**
 * In-memory download job manager with SSE client tracking.
 * Jobs survive browser disconnects - download continues on server.
 */

const jobs = new Map()
let _counter = 0

export function createJob(type, url) {
  const id = `job_${Date.now()}_${++_counter}`
  const job = {
    id,
    type,  // 'http' | 'magnet' | 'torrent'
    url,
    status: 'pending',  // pending | downloading | done | error
    progress: 0,
    speed: 0,
    eta: 0,
    total: 0,
    downloaded: 0,
    error: null,
    fileRecord: null,
    clients: new Set(),
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
  // Send current state immediately
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

// Clean up completed/errored jobs after 1 hour
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000
  for (const [id, job] of jobs) {
    if ((job.status === 'done' || job.status === 'error') && job.clients.size === 0) {
      // Check if job was created more than 1 hour ago (approximated by ID)
      const ts = parseInt(id.split('_')[1])
      if (ts < cutoff) jobs.delete(id)
    }
  }
}, 10 * 60 * 1000)
