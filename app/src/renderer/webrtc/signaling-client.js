// Thin wrapper around the signaling server's WebSocket protocol. Only relays
// registration, connect-request/accept/reject, and SDP/ICE — never media or passwords.
(function () {
  const MAX_CONNECT_RETRIES = 3

  class SignalingClient extends EventTarget {
    constructor(url) {
      super()
      this.url = url
      this.ws = null
      this.deviceId = null
      this._registered = false
      this._retriesLeft = MAX_CONNECT_RETRIES
    }

    connect(deviceId, token) {
      this.deviceId = deviceId
      this.token = token
      this._registered = false
      this._retriesLeft = MAX_CONNECT_RETRIES
      this._open()
    }

    _open() {
      const ws = new WebSocket(this.url)
      this.ws = ws

      ws.addEventListener('open', () => {
        this._send({ type: 'register', id: this.deviceId, token: this.token })
      })

      ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'registered') this._registered = true
        this.dispatchEvent(new CustomEvent('message', { detail: msg }))
      })

      // A brand-new connection can occasionally be dropped by the hosting
      // platform's proxy right at handshake time (observed on Render's free
      // tier when two clients connect within the same instant). Retry a few
      // times before surfacing a real disconnect to the app.
      ws.addEventListener('close', () => {
        if (!this._registered && this._retriesLeft > 0) {
          this._retriesLeft--
          setTimeout(() => this._open(), 500)
          return
        }
        this.dispatchEvent(new Event('close'))
      })

      // The 'close' handler above decides whether this is worth surfacing —
      // a transient error during a silent retry shouldn't reach the app.
      ws.addEventListener('error', () => {
        if (this._registered || this._retriesLeft <= 0) this.dispatchEvent(new CustomEvent('error'))
      })
    }

    _send(msg) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
    }

    requestConnection(targetId) {
      this._send({ type: 'connect-request', targetId, fromId: this.deviceId })
    }

    respondToRequest(targetId, accepted) {
      this._send({ type: accepted ? 'accept' : 'reject', targetId })
    }

    sendSignal(type, toId, payload) {
      this._send({ type, toId, payload })
    }
  }

  window.RDP = window.RDP || {}
  window.RDP.SignalingClient = SignalingClient
})()
