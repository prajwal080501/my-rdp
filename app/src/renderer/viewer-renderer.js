const statusEl = document.getElementById('status')
const videoEl = document.getElementById('remote-screen-video')
const disconnectBtn = document.getElementById('disconnect-btn')
const dropOverlay = document.getElementById('drop-overlay')

const shim = new window.RDP.IpcSignalingShim()
const peerSession = new window.RDP.PeerSession(shim)

let currentSessionId = null
let mediaRecorder = null

function startRecording(stream, sessionId) {
  window.rdp.send('recording-start', { sessionId })
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  mediaRecorder.addEventListener('dataavailable', async (event) => {
    if (event.data.size === 0) return
    const buffer = await event.data.arrayBuffer()
    window.rdp.send('recording-chunk', { sessionId, chunk: buffer })
  })
  mediaRecorder.addEventListener('stop', () => {
    window.rdp.send('recording-stop', { sessionId })
  })
  mediaRecorder.start(1000)
}

function stopRecording() {
  if (!mediaRecorder) return
  mediaRecorder.stop()
  mediaRecorder = null
}

function endSession(endReason) {
  if (!currentSessionId) return
  window.rdp.send('session-report-end', { sessionId: currentSessionId, endReason })
  stopRecording()
  currentSessionId = null
}

peerSession.addEventListener('status', (event) => {
  statusEl.textContent = event.detail
})

peerSession.addEventListener('remote-stream', (event) => {
  videoEl.srcObject = event.detail
  if (currentSessionId) startRecording(event.detail, currentSessionId)
})

peerSession.addEventListener('call-ended', (event) => {
  endSession(event.detail.reason)
})

window.RDP.attachInputCapture(videoEl, () => peerSession.channels)

window.RDP.attachFileDropZone(
  document.body,
  dropOverlay,
  () => peerSession.channels['file-transfer'],
  (progress) => {
    if (progress.type === 'start') {
      statusEl.textContent = `Sending ${progress.name}...`
    } else if (progress.type === 'progress') {
      statusEl.textContent = `Sending ${progress.name}... ${Math.round((progress.sent / progress.size) * 100)}%`
    } else if (progress.type === 'done') {
      statusEl.textContent = `Sent ${progress.name}.`
    } else if (progress.type === 'error') {
      statusEl.textContent = progress.message
    }
  }
)

disconnectBtn.addEventListener('click', () => {
  endSession('user_disconnected')
  peerSession.close()
  videoEl.srcObject = null
  window.rdp.send('end-viewer-session', {})
})

// A fresh 'session-init' can arrive for a window that's being reused (the
// user reconnected to a different remote ID after ending a prior call).
window.rdp.on('session-init', async ({ remoteId, iceServers, sessionId }) => {
  currentSessionId = sessionId
  const callerDeviceId = await window.rdp.getDeviceId()
  window.rdp.send('session-report-start', { sessionId, callerDeviceId, calleeDeviceId: remoteId })
  peerSession.beginOutgoingCall(remoteId, iceServers)
})
