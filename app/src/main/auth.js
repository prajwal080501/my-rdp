const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// Persisted session state: controlPlaneUrl, accessToken (+ its expiry),
// refreshToken, user, and — once a device has been registered — the
// signaling-scoped deviceToken (+ its expiry). Kept as one file so login and
// device registration share a single source of truth across app restarts.
let state = null

function authFilePath() {
  return path.join(app.getPath('userData'), 'auth.json')
}

function load() {
  if (state) return state
  try {
    state = JSON.parse(fs.readFileSync(authFilePath(), 'utf8'))
  } catch {
    state = null
  }
  return state
}

function save(next) {
  state = next
  if (next) fs.writeFileSync(authFilePath(), JSON.stringify(next))
  else {
    try {
      fs.unlinkSync(authFilePath())
    } catch {
      // Nothing to remove — already logged out.
    }
  }
}

// Reads the JWT's `exp` claim without verifying the signature — verification
// is control-plane's and the signaling server's job; we only need to know
// when to proactively refresh.
function decodeExpiryMs(token) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
  return payload.exp * 1000
}

// Without this, a hung control-plane request (e.g. a stalled database write)
// leaves the login/signup button silently unresponsive forever instead of
// surfacing an error the user can act on.
const REQUEST_TIMEOUT_MS = 15000

async function postJson(url, body, accessToken) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.')
    }
    // Covers both "nothing listening" (ECONNREFUSED) and "was listening,
    // then the connection dropped mid-request" (UND_ERR_SOCKET) — from the
    // caller's perspective both mean the same thing: couldn't reach it.
    if (err instanceof TypeError && err.message === 'fetch failed') {
      throw new Error(`Could not reach the server at ${url}. Make sure it's running and reachable.`)
    }
    throw err
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error((data && data.error) || res.statusText)
  return data
}

async function login(controlPlaneUrl, email, password) {
  const data = await postJson(`${controlPlaneUrl}/auth/login`, { email, password })
  save({
    controlPlaneUrl,
    accessToken: data.accessToken,
    accessTokenExpiresAt: decodeExpiryMs(data.accessToken),
    refreshToken: data.refreshToken,
    user: data.user
  })
  return data.user
}

// Only succeeds once per control-plane deployment — /auth/signup bootstraps
// the first org and its owner, then disables itself. Every login after that
// comes from an owner/admin creating the account via POST /auth/users.
async function signup(controlPlaneUrl, email, password, orgName) {
  const data = await postJson(`${controlPlaneUrl}/auth/signup`, { email, password, orgName })
  save({
    controlPlaneUrl,
    accessToken: data.accessToken,
    accessTokenExpiresAt: decodeExpiryMs(data.accessToken),
    refreshToken: data.refreshToken,
    user: data.user
  })
  return data.user
}

async function logout() {
  const current = load()
  if (current) {
    await postJson(`${current.controlPlaneUrl}/auth/logout`, { refreshToken: current.refreshToken }).catch(() => {})
  }
  save(null)
}

async function refresh() {
  const current = load()
  if (!current) throw new Error('Not logged in')

  let data
  try {
    data = await postJson(`${current.controlPlaneUrl}/auth/refresh`, { refreshToken: current.refreshToken })
  } catch (err) {
    save(null)
    throw err
  }

  const next = {
    ...current,
    accessToken: data.accessToken,
    accessTokenExpiresAt: decodeExpiryMs(data.accessToken),
    refreshToken: data.refreshToken
  }
  save(next)
  return next
}

// Refresh a little before actual expiry so a call made right at the boundary
// doesn't race a control-plane request using an already-dead token.
const REFRESH_SKEW_MS = 60 * 1000

async function getSession() {
  let current = load()
  if (!current) return null
  if (current.accessTokenExpiresAt - Date.now() < REFRESH_SKEW_MS) {
    current = await refresh()
  }
  return current
}

const DEVICE_TOKEN_SKEW_MS = 60 * 60 * 1000

// Binds this app's local deviceId to the logged-in user/org and returns the
// narrow-scope token the signaling server accepts. Cached across launches;
// only re-registers when the cached token is missing or close to expiry.
async function getDeviceToken(deviceId) {
  const session = await getSession()
  if (!session) throw new Error('Not logged in')

  if (session.deviceToken && session.deviceTokenExpiresAt - Date.now() > DEVICE_TOKEN_SKEW_MS) {
    return { deviceToken: session.deviceToken, freshlyRegistered: false }
  }

  const data = await postJson(`${session.controlPlaneUrl}/devices/register`, { deviceId }, session.accessToken)
  const next = {
    ...session,
    deviceToken: data.deviceToken,
    deviceTokenExpiresAt: decodeExpiryMs(data.deviceToken)
  }
  save(next)
  return { deviceToken: data.deviceToken, freshlyRegistered: true }
}

module.exports = { login, signup, logout, getSession, getDeviceToken }
