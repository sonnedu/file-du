/**
 * Extract API token from request.
 * Supports: Authorization: Bearer <token>  OR  ?token=<token>
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'] || ''
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim()
  return req.query.token || null
}

/**
 * Validate token against API_TOKEN env var.
 */
function isValidToken(token) {
  const apiToken = process.env.API_TOKEN
  if (!apiToken) return false           // token auth disabled if not configured
  return token === apiToken
}

/**
 * Requires either valid session OR valid API token.
 * Used by endpoints that support both browser UI and curl.
 */
export function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next()
  const token = extractToken(req)
  if (token && isValidToken(token)) return next()
  return res.status(401).json({ error: 'Unauthorized' })
}

/**
 * Requires a valid API token only (no session fallback).
 * Used by endpoints designed exclusively for programmatic access.
 */
export function requireTokenAuth(req, res, next) {
  const token = extractToken(req)
  if (token && isValidToken(token)) return next()
  return res.status(401).json({ error: 'Unauthorized: valid API_TOKEN required' })
}

