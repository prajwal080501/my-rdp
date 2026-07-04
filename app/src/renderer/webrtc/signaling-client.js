// Thin wrapper around the signaling server's WebSocket protocol. Only relays
// registration, connect-request/accept/reject, and SDP/ICE — never media or passwords.
(function () {
  class SignalingClient extends EventTarget {
    constructor(url) {
      super()
      this.url = url
      this.ws = null
      this.deviceId = null
    }

    connect(deviceId) {
      this.deviceId = deviceId
      this.ws = new WebSocket(this.url)

      this.ws.addEventListener('open', () => {
        this._send({ type: 'register', id: deviceId })
      })

      this.ws.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data)
        this.dispatchEvent(new CustomEvent('message', { detail: msg }))
      })

      this.ws.addEventListener('close', () => {
        this.dispatchEvent(new Event('close'))
      })

      this.ws.addEventListener('error', () => {
        this.dispatchEvent(new CustomEvent('error'))
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
