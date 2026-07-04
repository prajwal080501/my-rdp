const { Router } = require('express')
const Session = require('../models/Session')
const { requireAuth } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')

const router = Router()

// The Electron app calls this once a call is accepted, using the sessionId
// the caller generated and threaded through the viewer's session-init payload.
router.post('/start', requireAuth, async (req, res) => {
  const { sessionId, callerDeviceId, calleeDeviceId, startedAt } = req.body
  if (!sessionId || !callerDeviceId || !calleeDeviceId) {
    return res.status(400).json({ error: 'sessionId, callerDeviceId, and calleeDeviceId are required' })
  }

  const session = await Session.create({
    sessionId,
    orgId: req.user.orgId,
    callerDeviceId,
    calleeDeviceId,
    startedAt: startedAt ? new Date(startedAt) : new Date()
  })
  res.status(201).json({ session })
})

router.post('/end', requireAuth, async (req, res) => {
  const { sessionId, endedAt, endReason } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

  const session = await Session.findOneAndUpdate(
    { sessionId, orgId: req.user.orgId },
    { endedAt: endedAt ? new Date(endedAt) : new Date(), endReason },
    { new: true }
  )
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json({ session })
})

router.get('/', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const { limit = 50, before } = req.query
  const query = { orgId: req.user.orgId }
  if (before) query.startedAt = { $lt: new Date(before) }

  const sessions = await Session
    .find(query)
    .sort({ startedAt: -1 })
    .limit(Math.min(Number(limit) || 50, 200))
  res.json({ sessions })
})

module.exports = router
