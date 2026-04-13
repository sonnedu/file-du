import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'
const DB_PATH = path.join(DATA_DIR, 'db.json')

const defaults = () => ({ files: [] })

function readDb() {
  try {
    if (!existsSync(DB_PATH)) return defaults()
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  } catch {
    return defaults()
  }
}

function writeDb(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export function getFiles({ search = '', sortBy = 'uploadedAt', sortDir = 'desc' } = {}) {
  const db = readDb()
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

export function getFile(id) {
  return readDb().files.find(f => f.id === id) || null
}

export function getTotalSize() {
  const db = readDb()
  return db.files.reduce((acc, f) => acc + (f.size || 0), 0)
}

export function addFile(file) {
  const db = readDb()
  db.files.push(file)
  writeDb(db)
  return file
}

export function updateFile(id, updates) {
  const db = readDb()
  const idx = db.files.findIndex(f => f.id === id)
  if (idx === -1) return null
  db.files[idx] = { ...db.files[idx], ...updates }
  writeDb(db)
  return db.files[idx]
}

export function deleteFile(id) {
  const db = readDb()
  const idx = db.files.findIndex(f => f.id === id)
  if (idx === -1) return false
  db.files.splice(idx, 1)
  writeDb(db)
  return true
}

export function incrementDownloads(id) {
  const db = readDb()
  const file = db.files.find(f => f.id === id)
  if (file) {
    file.downloads = (file.downloads || 0) + 1
    writeDb(db)
  }
}
