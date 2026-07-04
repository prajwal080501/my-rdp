const auth = require('./auth')

// One-direction dependency on auth.js (session/token management) only — auth
// itself does its own raw fetches for login/refresh/device-registration, so
// there's no cycle back into this module.
async function request(method, path, body) {
  const session = await auth.getSession()
  if (!session) throw new Error('Not logged in')

  const res = await fetch(`${session.controlPlaneUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error((data && data.error) || res.statusText)
  return data
}

module.exports = {
  post: (path, body) => request('POST', path, body),
  get: (path) => request('GET', path)
}
