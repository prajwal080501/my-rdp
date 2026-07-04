const { Router } = require('express')
const Device = require('../models/Device')
const { signDeviceToken } = require('../lib/jwt')
const { requireAuth } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')

const router = Router()

// Called once per app launch after login: binds the app's locally-generated
// deviceId to this user/org and returns the narrow-scope token the signaling
// server accepts. Idempotent — re-registering the same deviceId just refreshes it.
router.post('/register', requireAuth, async (req, res) => {
  const { deviceId, name } = req.body
  if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

  const existing = await Device.findOne({ deviceId })
  if (existing && String(existing.orgId) !== String(req.user.orgId)) {
    return res.status(409).json({ error: 'deviceId is already registered to a different org' })
  }

  await Device.findOneAndUpdate(
    { deviceId },
    { deviceId, orgId: req.user.orgId, ownerUserId: req.user.userId, name, lastSeenAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  )

  const deviceToken = signDeviceToken({ deviceId, orgId: req.user.orgId, userId: req.user.userId })
  res.json({ deviceToken })
})

router.get('/', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const devices = await Device.find({ orgId: req.user.orgId }).sort({ lastSeenAt: -1 })
  res.json({ devices })
})

module.exports = router
