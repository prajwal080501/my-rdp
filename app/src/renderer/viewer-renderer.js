const statusEl = document.getElementById('status')
const videoEl = document.getElementById('remote-screen-video')
const disconnectBtn = document.getElementById('disconnect-btn')

const shim = new window.RDP.IpcSignalingShim()
const peerSession = new window.RDP.PeerSession(shim)

peerSession.addEventListener('status', (event) => {
  statusEl.textContent = event.detail
})

peerSession.addEventListener('remote-stream', (event) => {
  videoEl.srcObject = event.detail
})

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
