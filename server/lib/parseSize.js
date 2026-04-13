/**
 * 解析人类可读的文件大小字符串为字节数
 * 支持：8GB、500MB、1024KB、2048B、纯数字（视为字节）
 * 不区分大小写，支持空格：8 GB、8gb、8Gb 均有效
 *
 * @param {string|number} value
 * @returns {number} bytes
 */
export function parseSize(value) {
  if (typeof value === 'number') return Math.floor(value)
  if (!value) return 0

  const str = String(value).trim()
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(GB?|MB?|KB?|B|TB?)?$/i)

  if (!match) {
    const n = parseInt(str, 10)
    if (isNaN(n)) throw new Error(`Invalid MAX_FILE_SIZE value: "${value}"`)
    return n
  }

  const num = parseFloat(match[1])
  const unit = (match[2] || 'B').toUpperCase()

  const units = {
    B: 1,
    K: 1024,
    KB: 1024,
    M: 1024 ** 2,
    MB: 1024 ** 2,
    G: 1024 ** 3,
    GB: 1024 ** 3,
    T: 1024 ** 4,
    TB: 1024 ** 4,
  }
  const multiplier = units[unit]

  if (!multiplier) throw new Error(`Unknown size unit "${unit}" in MAX_FILE_SIZE="${value}"`)
  return Math.floor(num * multiplier)
}
