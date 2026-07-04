const statusEl = document.getElementById('status')
const signalingUrlInput = document.getElementById('signaling-url')
const signalingConnectBtn = document.getElementById('signaling-connect-btn')

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

async function main() {
  const deviceId = await window.rdp.getDeviceId()

  const homeView = window.RDP.initHomeView({
    deviceId,
    onConnect: (targetId) => peerSession.connectTo(targetId)
  })

  const remoteView = window.RDP.initRemoteView({
    onDisconnect: () => {
      peerSession.close()
      remoteView.clear()
      remoteView.setVisible(false)
      homeView.setVisible(true)
      setStatus('Disconnected.')
    }
  })

  let signaling = null
  let peerSession = null

  signalingConnectBtn.addEventListener('click', () => {
    signaling = new window.RDP.SignalingClient(signalingUrlInput.value.trim())
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

    peerSession.addEventListener('remote-stream', (event) => {
      homeView.setVisible(false)
      remoteView.setVisible(true)
      remoteView.showStream(event.detail)
    })

    signaling.connect(deviceId)
    setStatus(`Connecting to signaling server at ${signalingUrlInput.value.trim()}...`)
  })
}

main()
