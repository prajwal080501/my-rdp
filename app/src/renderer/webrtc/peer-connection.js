// Manages the RTCPeerConnection lifecycle for one remote pairing, driven by
// messages relayed through SignalingClient. Decoupled from screen-capture
// specifics: when acting as callee it asks the caller for a local stream via
// the 'need-local-stream' event rather than calling desktopCapturer itself.
(function () {
  const DEFAULT_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

  // Three purpose-built channels instead of one, so a large file transfer can
  // never head-of-line-block a keystroke, and continuous mouse-move traffic
  // never queues up behind itself under packet loss.
  const CHANNEL = {
    FAST_INPUT: 'input-fast',
    RELIABLE_INPUT: 'input-reliable',
    FILE_TRANSFER: 'file-transfer'
  }

  class PeerSession extends EventTarget {
    constructor(signalingClient) {
      super()
      this.signaling = signalingClient
      this.pc = null
      this.iceServers = DEFAULT_ICE_SERVERS
      this.remoteId = null
      this.role = null
      // True once an outgoing call has been handed off to the viewer window,
      // which owns the actual RTCPeerConnection from that point on — this
      // instance just relays the remaining signaling messages for it.
      this._delegated = false
      // label -> open RTCDataChannel. Populated as channels come up on
      // either side; see _registerChannel and the 'data-channel' event.
      this.channels = {}

      this.signaling.addEventListener('message', (event) => {
        this._onSignalingMessage(event.detail).catch((err) => this._status(`Signaling handling error: ${err.message}`))
      })
    }

    setIceServers(iceServers) {
      if (iceServers && iceServers.length > 0) this.iceServers = iceServers
    }

    // Caller side: request to view remoteId's screen.
    connectTo(remoteId) {
      this.remoteId = remoteId
      this.role = 'caller'
      this.signaling.requestConnection(remoteId)
      this._status(`Requesting connection to ${remoteId}...`)
    }

    // True if there's already a live (possibly hidden) viewer session for this ID.
    isDelegatedTo(remoteId) {
      return this._delegated && this.remoteId === remoteId
    }

    // Called once the viewer window reports the call has really ended.
    resetDelegation() {
      this._delegated = false
      this.remoteId = null
    }

    // Used by the viewer window's own PeerSession, once the home window has
    // handed off an already-accepted outgoing call to it.
    beginOutgoingCall(remoteId, iceServers) {
      this.remoteId = remoteId
      this.role = 'caller'
      this.setIceServers(iceServers)
      return this._createOfferAsCaller()
    }

    // Callee side: answer an incoming-request notification.
    respondToIncoming(accept) {
      this.signaling.respondToRequest(this.remoteId, accept)
      if (!accept) {
        this.remoteId = null
        return
      }
      this.role = 'callee'
    }

    async _onSignalingMessage(msg) {
      // Once delegated, these three message types belong to the call now
      // running in the viewer window — relay them there instead of handling
      // locally (this.pc doesn't exist here for a delegated call).
      if (this._delegated && (msg.type === 'sdp-answer' || msg.type === 'ice-candidate' || msg.type === 'peer-disconnected')) {
        this.dispatchEvent(new CustomEvent('delegate-message', { detail: msg }))
        if (msg.type === 'peer-disconnected') {
          this._delegated = false
          this.remoteId = null
        }
        return
      }

      switch (msg.type) {
        case 'registered':
          this.setIceServers(msg.iceServers)
          this._status(`Registered with signaling server as ${msg.id}.`)
          break

        case 'incoming-request':
          this.remoteId = msg.fromId
          this.dispatchEvent(new CustomEvent('incoming-request', { detail: { fromId: msg.fromId } }))
          break

        case 'accepted': {
          this._status('Accepted — opening viewer window...')
          this._delegated = true
          const { remoteId, iceServers } = this
          // Generated once here (caller side) and threaded through to the
          // viewer window via session-init — the single id both the session
          // and recording records key off of.
          const sessionId = crypto.randomUUID()
          this.dispatchEvent(new CustomEvent('call-accepted', { detail: { remoteId, iceServers, sessionId } }))
          break
        }

        case 'rejected':
          this._status('Connection rejected by remote peer.')
          this.remoteId = null
          break

        case 'sdp-offer':
          await this._handleOffer(msg.payload)
          break

        case 'sdp-answer':
          await this.pc.setRemoteDescription(msg.payload)
          break

        case 'ice-candidate':
          if (this.pc) {
            try {
              await this.pc.addIceCandidate(msg.payload)
            } catch {
              // Candidate arriving before remote description is set is expected
              // occasionally under real network jitter; safe to ignore.
            }
          }
          break

        case 'peer-disconnected':
          this._status('Remote peer disconnected.')
          // Fired before close() so listeners (session/recording bookkeeping)
          // can tell this apart from the local user clicking Disconnect.
          this.dispatchEvent(new CustomEvent('call-ended', { detail: { reason: 'peer_disconnected' } }))
          this.close()
          break

        case 'error':
          this._status(`Error: ${msg.message}`)
          break

        default:
          break
      }
    }

    _createPeerConnection() {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers })

      pc.onicecandidate = (event) => {
        if (event.candidate) this.signaling.sendSignal('ice-candidate', this.remoteId, event.candidate)
      }

      pc.ontrack = (event) => {
        this.dispatchEvent(new CustomEvent('remote-stream', { detail: event.streams[0] }))
      }

      pc.onconnectionstatechange = () => this._status(`Connection state: ${pc.connectionState}`)

      // Callee side: the caller creates the channels in-band with its offer;
      // this is how we receive them.
      pc.ondatachannel = (event) => this._registerChannel(event.channel)

      this.pc = pc
      return pc
    }

    // Tracked by label and surfaced via 'data-channel' once actually usable —
    // input/file logic lives in the renderer that uses PeerSession, not here.
    _registerChannel(channel) {
      channel.binaryType = 'arraybuffer'
      const announce = () => {
        this.channels[channel.label] = channel
        this.dispatchEvent(new CustomEvent('data-channel', { detail: { label: channel.label, channel } }))
      }
      if (channel.readyState === 'open') announce()
      else channel.addEventListener('open', announce, { once: true })
    }

    async _createOfferAsCaller() {
      const pc = this._createPeerConnection()
      // Caller has no local tracks to offer; add a recvonly transceiver so the
      // SDP actually negotiates a video m-line for the callee to answer into.
      pc.addTransceiver('video', { direction: 'recvonly' })

      // Created here (not on the callee) so they're negotiated as part of
      // this same offer/answer — no extra signaling round-trip needed.
      this._registerChannel(pc.createDataChannel(CHANNEL.FAST_INPUT, { ordered: false, maxRetransmits: 0 }))
      this._registerChannel(pc.createDataChannel(CHANNEL.RELIABLE_INPUT))
      this._registerChannel(pc.createDataChannel(CHANNEL.FILE_TRANSFER))

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      this.signaling.sendSignal('sdp-offer', this.remoteId, offer)
    }

    async _handleOffer(offer) {
      const pc = this._createPeerConnection()
      await pc.setRemoteDescription(offer)

      const stream = await this._requestLocalStream()
      for (const track of stream.getTracks()) pc.addTrack(track, stream)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      this.signaling.sendSignal('sdp-answer', this.remoteId, answer)
    }

    _requestLocalStream() {
      return new Promise((resolve, reject) => {
        this.dispatchEvent(new CustomEvent('need-local-stream', { detail: { resolve, reject } }))
      })
    }

    _status(message) {
      this.dispatchEvent(new CustomEvent('status', { detail: message }))
    }

    close() {
      if (this.pc) {
        this.pc.close()
        this.pc = null
      }
      this.channels = {}
      this.remoteId = null
      this.role = null
      this._delegated = false
    }
  }

  window.RDP = window.RDP || {}
  window.RDP.PeerSession = PeerSession
})()
