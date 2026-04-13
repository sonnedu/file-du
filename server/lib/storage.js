import { unlink, access } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || './data'

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
export const TEMP_DIR = path.join(DATA_DIR, 'temp')

export function ensureDirectories() {
  for (const dir of [DATA_DIR, UPLOADS_DIR, TEMP_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

export function getFilePath(storedName) {
  return path.join(UPLOADS_DIR, storedName)
}

export async function deleteStoredFile(storedName) {
  const filePath = getFilePath(storedName)
  try {
    await access(filePath)
    await unlink(filePath)
    return true
  } catch {
    return false
  }
}
