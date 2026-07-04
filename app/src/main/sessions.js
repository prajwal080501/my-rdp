const controlPlane = require('./control-plane-client')

// Session start/end are their own control-plane collection (not just audit
// events) because they carry the recording link — see recording.js — and
// because "how long did this session run" is a structured query admins need,
// not just a log line to grep.
function reportSessionStart({ sessionId, callerDeviceId, calleeDeviceId }) {
  controlPlane
    .post('/sessions/start', { sessionId, callerDeviceId, calleeDeviceId, startedAt: new Date().toISOString() })
    .catch((err) => console.error('session start report failed:', err.message))
}

function reportSessionEnd({ sessionId, endReason }) {
  controlPlane
    .post('/sessions/end', { sessionId, endedAt: new Date().toISOString(), endReason })
    .catch((err) => console.error('session end report failed:', err.message))
}

module.exports = { reportSessionStart, reportSessionEnd }
