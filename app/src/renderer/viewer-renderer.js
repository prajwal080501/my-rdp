const statusEl = document.getElementById('status')
const videoEl = document.getElementById('remote-screen-video')
const disconnectBtn = document.getElementById('disconnect-btn')
const dropOverlay = document.getElementById('drop-overlay')

const shim = new window.RDP.IpcSignalingShim()
const peerSession = new window.RDP.PeerSession(shim)

peerSession.addEventListener('status', (event) => {
  statusEl.textContent = event.detail
})

peerSession.addEventListener('remote-stream', (event) => {
  videoEl.srcObject = event.detail
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
  peerSession.close()
  videoEl.srcObject = null
  window.rdp.send('end-viewer-session', {})
})

// A fresh 'session-init' can arrive for a window that's being reused (the
// user reconnected to a different remote ID after ending a prior call).
window.rdp.on('session-init', ({ remoteId, iceServers }) => {
  peerSession.beginOutgoingCall(remoteId, iceServers)
})
