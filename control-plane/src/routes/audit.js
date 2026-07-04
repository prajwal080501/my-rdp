const { Router } = require('express')
const AuditEvent = require('../models/AuditEvent')
const { requireAuth } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')

const router = Router()

// Fire-and-forget from the app's perspective (see app/src/main/audit.js) —
// write is intentionally cheap and never touches the audit trail's read path.
router.post('/', requireAuth, async (req, res) => {
  const { type, deviceId, payload } = req.body
  if (!type) return res.status(400).json({ error: 'type is required' })

  await AuditEvent.create({
    orgId: req.user.orgId,
    userId: req.user.userId,
    deviceId,
    type,
    payload: payload || {}
  })
  res.status(204).end()
})

router.get('/', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const { type, deviceId, userId, since, until, limit = 100, before } = req.query
  const query = { orgId: req.user.orgId }
  if (type) query.type = type
  if (deviceId) query.deviceId = deviceId
  if (userId) query.userId = userId
  if (since || until) {
    query.createdAt = {}
    if (since) query.createdAt.$gte = new Date(since)
    if (until) query.createdAt.$lte = new Date(until)
  }
  if (before) query.createdAt = { ...query.createdAt, $lt: new Date(before) }

  const events = await AuditEvent
    .find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
  res.json({ events })
})

module.exports = router
