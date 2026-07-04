// Manages the RTCPeerConnection lifecycle for one remote pairing, driven by
// messages relayed through SignalingClient. Decoupled from screen-capture
// specifics: when acting as callee it asks the caller for a local stream via
// the 'need-local-stream' event rather than calling desktopCapturer itself.
(function () {
  const DEFAULT_ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

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
          this.dispatchEvent(new CustomEvent('call-accepted', { detail: { remoteId, iceServers } }))
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

      this.pc = pc
      return pc
    }

    async _createOfferAsCaller() {
      const pc = this._createPeerConnection()
      // Caller has no local tracks to offer; add a recvonly transceiver so the
      // SDP actually negotiates a video m-line for the callee to answer into.
      pc.addTransceiver('video', { direction: 'recvonly' })
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
      this.remoteId = null
      this.role = null
      this._delegated = false
    }
  }

  window.RDP = window.RDP || {}
  window.RDP.PeerSession = PeerSession
})()
