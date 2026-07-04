const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_TTL = '1h'
const DEVICE_TOKEN_TTL = '30d'

function secret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET is required')
  return s
}

// Short-lived, used to call this API as a logged-in user.
function signAccessToken({ userId, orgId, role }) {
  return jwt.sign({ userId, orgId, role }, secret(), { expiresIn: ACCESS_TOKEN_TTL })
}

// Long-lived and narrowly scoped: this is the only token the Electron app
// ever hands to the signaling server, so it must not carry the user's role
// or any capability beyond registering this one device.
function signDeviceToken({ deviceId, orgId, userId }) {
  return jwt.sign({ deviceId, orgId, userId, scope: 'signaling' }, secret(), { expiresIn: DEVICE_TOKEN_TTL })
}

function verifyToken(token) {
  return jwt.verify(token, secret())
}

module.exports = { signAccessToken, signDeviceToken, verifyToken }
