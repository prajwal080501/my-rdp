// Gate a route to specific roles, e.g. requireRole('owner', 'admin').
// Must run after requireAuth.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role' })
    }
    next()
  }
}

module.exports = { requireRole }
