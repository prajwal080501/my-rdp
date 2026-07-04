const controlPlane = require('./control-plane-client')

const MAX_ATTEMPTS = 3

// Fire-and-forget from every call site's perspective: the audit trail must
// never block or break the actual remote-control flow it's describing.
// Retries a couple of times on transient failure (network blip, control-plane
// restart), then gives up rather than queuing forever.
async function post(event, attempt = 1) {
  try {
    await controlPlane.post('/audit', event)
  } catch (err) {
    if (attempt >= MAX_ATTEMPTS) {
      console.error(`audit event dropped after ${attempt} attempts:`, event.type, err.message)
      return
    }
    setTimeout(() => post(event, attempt + 1), attempt * 1000)
  }
}

function reportEvent(type, payload = {}) {
  const { deviceId, ...rest } = payload
  post({ type, deviceId, payload: rest })
}

module.exports = { reportEvent }
