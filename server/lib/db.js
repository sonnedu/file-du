import { readFile, writeFile, access } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import lockfile from 'proper-lockfile'

const DATA_DIR = process.env.DATA_DIR || './data'
const DB_PATH = path.join(DATA_DIR, 'db.json')

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

const defaults = () => ({ files: [] })

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function withLock(fn) {
  if (!(await fileExists(DB_PATH))) {
    await writeFile(DB_PATH, JSON.stringify(defaults()), 'utf-8')
  }
  return lockfile.lock(DB_PATH).then(async release => {
    try {
      const result = await fn()
      return result
    } finally {
      await release()
    }
  })
}

async function readDb() {
  try {
    if (!(await fileExists(DB_PATH))) return defaults()
    const content = await readFile(DB_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return defaults()
  }
}

async function writeDb(data) {
  await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export async function getFiles({ search = '', sortBy = 'uploadedAt', sortDir = 'desc' } = {}) {
  const db = await readDb()
  let files = [...db.files]

  if (search) {
    const q = search.toLowerCase()
    files = files.filter(f => f.originalName.toLowerCase().includes(q))
  }

  files.sort((a, b) => {
    const va = a[sortBy] ?? ''
    const vb = b[sortBy] ?? ''
    if (sortDir === 'desc') return va < vb ? 1 : va > vb ? -1 : 0
    return va > vb ? 1 : va < vb ? -1 : 0
  })

  return files
}

export async function getFile(id) {
  const db = await readDb()
  return db.files.find(f => f.id === id) || null
}

export async function getTotalSize() {
  const db = await readDb()
  return db.files.reduce((acc, f) => acc + (f.size || 0), 0)
}

export async function addFile(file) {
  return withLock(async () => {
    const db = await readDb()
    db.files.push(file)
    await writeDb(db)
    return file
  })
}

export async function updateFile(id, updates) {
  return withLock(async () => {
    const db = await readDb()
    const idx = db.files.findIndex(f => f.id === id)
    if (idx === -1) return null
    db.files[idx] = { ...db.files[idx], ...updates }
    await writeDb(db)
    return db.files[idx]
  })
}

export async function deleteFile(id) {
  return withLock(async () => {
    const db = await readDb()
    const idx = db.files.findIndex(f => f.id === id)
    if (idx === -1) return false
    db.files.splice(idx, 1)
    await writeDb(db)
    return true
  })
}

export async function incrementDownloads(id) {
  return withLock(async () => {
    const db = await readDb()
    const file = db.files.find(f => f.id === id)
    if (file) {
      file.downloads = (file.downloads || 0) + 1
      await writeDb(db)
    }
  })
}
