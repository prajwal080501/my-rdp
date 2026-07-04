const { verifyToken } = require('../lib/jwt')

// Verifies a user access token (not a device token) and attaches the claims
// to req.user for downstream handlers/RBAC checks.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (!token) return res.status(401).json({ error: 'Missing bearer token' })

  try {
    const claims = verifyToken(token)
    if (claims.scope) return res.status(401).json({ error: 'Not a user access token' })
    req.user = claims
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { requireAuth }
