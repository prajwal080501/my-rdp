const statusEl = document.getElementById('status')
const signalingUrlInput = document.getElementById('signaling-url')
const signalingConnectBtn = document.getElementById('signaling-connect-btn')

// Your deployed signaling server — used the first time the app runs. After
// that, whatever URL was last used (e.g. a local server for testing) wins.
const DEFAULT_SIGNALING_URL = 'wss://my-rdp-uwwj.onrender.com'

function setStatus(message) {
  statusEl.textContent = message
}

async function getLocalScreenStream() {
  const sources = await window.rdp.getScreenSources()
  if (sources.length === 0) {
    throw new Error(
      'No screen sources available. On macOS, grant Screen Recording permission ' +
      'and restart the app.'
    )
  }

  // Phase 2: always share the whole screen. Source picker UI comes later.
  const source = sources[0]
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: source.id,
        maxFrameRate: 30
      }
    }
  })
}

let signaling = null
let peerSession = null

function connectToSignaling(deviceId) {
  const url = signalingUrlInput.value.trim()
  localStorage.setItem('signalingUrl', url)

  signaling = new window.RDP.SignalingClient(url)
  peerSession = new window.RDP.PeerSession(signaling)

  signaling.addEventListener('close', () => setStatus('Disconnected from signaling server.'))
  signaling.addEventListener('error', () => setStatus('Signaling server connection error.'))

  peerSession.addEventListener('status', (event) => setStatus(event.detail))

  peerSession.addEventListener('incoming-request', (event) => {
    const accept = window.confirm(`Incoming connection request from ${event.detail.fromId}. Accept?`)
    peerSession.respondToIncoming(accept)
  })

  peerSession.addEventListener('need-local-stream', async (event) => {
    try {
      const stream = await getLocalScreenStream()
      event.detail.resolve(stream)
    } catch (err) {
      event.detail.reject(err)
      setStatus(err.message)
    }
  })

  // Outgoing call accepted: hand it off to a dedicated viewer window rather
  // than showing the video in this window.
  peerSession.addEventListener('call-accepted', (event) => {
    window.rdp.send('open-viewer', event.detail)
  })

  // Signaling messages for a delegated call get relayed on to the viewer window.
  peerSession.addEventListener('delegate-message', (event) => {
    window.rdp.send('signal-to-viewer', event.detail)
  })

  // This window plays the host role, so it's the one receiving input and
  // incoming files from whoever is viewing/controlling us.
  peerSession.addEventListener('data-channel', (event) => {
    const { label, channel } = event.detail
    if (label === 'input-fast' || label === 'input-reliable') {
      channel.addEventListener('message', (msgEvent) => {
        window.rdp.send('inject-input', JSON.parse(msgEvent.data))
      })
    } else if (label === 'file-transfer') {
      window.RDP.wireFileReceiver(channel, setStatus)
    }
  })

  signaling.connect(deviceId)
  setStatus(`Connecting to signaling server at ${url}...`)
}

async function main() {
  const deviceId = await window.rdp.getDeviceId()

  signalingUrlInput.value = localStorage.getItem('signalingUrl') || DEFAULT_SIGNALING_URL

  window.RDP.initHomeView({
    deviceId,
    onConnect: (targetId) => {
      if (!peerSession) return
      // Already have a live (maybe hidden) viewer session for this ID —
      // just reshow it instead of redoing the connect/accept handshake.
      if (peerSession.isDelegatedTo(targetId)) {
        window.rdp.send('open-viewer', { remoteId: targetId, iceServers: peerSession.iceServers })
        return
      }
      peerSession.connectTo(targetId)
    }
  })

  // Relay IPC for whichever signaling/peerSession is current — registered
  // once so reconnecting later doesn't stack up duplicate listeners.
  window.rdp.on('viewer-signal-out', (msg) => {
    if (signaling) signaling.sendSignal(msg.type, msg.toId, msg.payload)
  })

  window.rdp.on('viewer-session-ended', () => {
    if (peerSession) peerSession.resetDelegation()
    setStatus('Call ended.')
  })

  signalingConnectBtn.addEventListener('click', () => connectToSignaling(deviceId))

  connectToSignaling(deviceId)
}

main()
