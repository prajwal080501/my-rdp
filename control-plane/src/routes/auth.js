const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { Router } = require('express')
const Org = require('../models/Org')
const User = require('../models/User')
const RefreshToken = require('../models/RefreshToken')
const { signAccessToken } = require('../lib/jwt')
const { requireAuth } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')

const router = Router()

const BCRYPT_ROUNDS = 12
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function generateTempPassword() {
  return crypto.randomBytes(12).toString('base64url')
}

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  })
  return token
}

function toPublicUser(user) {
  return {
    id: user._id,
    email: user.email,
    orgId: user.orgId,
    role: user.role,
    mustChangePassword: user.mustChangePassword
  }
}

// Only works once: the first signup on a fresh deployment bootstraps the org
// and its owner. Every user after that is created via POST /auth/users by an
// existing owner/admin — there's no self-serve signup and no SMTP dependency.
router.post('/signup', async (req, res) => {
  const { email, password, orgName } = req.body
  if (!email || !password || !orgName) {
    return res.status(400).json({ error: 'email, password, and orgName are required' })
  }

  const existingOrgCount = await Org.countDocuments()
  if (existingOrgCount > 0) {
    return res.status(403).json({ error: 'Signup is disabled. Ask your org owner to create your account.' })
  }

  const org = await Org.create({ name: orgName })
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await User.create({ email, passwordHash, orgId: org._id, role: 'owner' })

  const accessToken = signAccessToken({ userId: user._id, orgId: org._id, role: user.role })
  const refreshToken = await issueRefreshToken(user._id)
  res.status(201).json({ accessToken, refreshToken, user: toPublicUser(user) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email: (email || '').toLowerCase().trim() })
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const accessToken = signAccessToken({ userId: user._id, orgId: user.orgId, role: user.role })
  const refreshToken = await issueRefreshToken(user._id)
  res.json({ accessToken, refreshToken, user: toPublicUser(user) })
})

// Rotates the refresh token on every use: the old one is revoked and a new
// one issued, so a stolen-but-unused token becomes detectable (reuse of a
// revoked token) rather than silently valid forever.
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' })

  const record = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) })
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' })
  }

  const user = await User.findById(record.userId)
  if (!user) return res.status(401).json({ error: 'Invalid or expired refresh token' })

  record.revokedAt = new Date()
  await record.save()

  const accessToken = signAccessToken({ userId: user._id, orgId: user.orgId, role: user.role })
  const newRefreshToken = await issueRefreshToken(user._id)
  res.json({ accessToken, refreshToken: newRefreshToken })
})

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body
  if (refreshToken) {
    await RefreshToken.updateOne({ tokenHash: hashToken(refreshToken) }, { revokedAt: new Date() })
  }
  res.status(204).end()
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(toPublicUser(user))
})

// Owners/admins create teammates directly — the temp password is returned
// once in this response and must be relayed out-of-band (Slack, in person).
router.post('/users', requireAuth, requireRole('owner', 'admin'), async (req, res) => {
  const { email, role } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })
  if (role && !User.ROLES.includes(role)) return res.status(400).json({ error: `role must be one of ${User.ROLES.join(', ')}` })

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS)
  const user = await User.create({
    email,
    passwordHash,
    orgId: req.user.orgId,
    role: role || 'member',
    mustChangePassword: true
  })

  res.status(201).json({ user: toPublicUser(user), tempPassword })
})

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!newPassword) return res.status(400).json({ error: 'newPassword is required' })

  const user = await User.findById(req.user.userId)
  if (!(await bcrypt.compare(currentPassword || '', user.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  user.mustChangePassword = false
  await user.save()
  res.status(204).end()
})

module.exports = router
