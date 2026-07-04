// Implements the same interface PeerSession expects from a SignalingClient
// (sendSignal + a 'message' event), but relayed through the main process to
// the home window's real WebSocket instead of owning a socket itself. This
// lets the viewer window run an ordinary PeerSession without a signaling
// connection of its own — the underlying device ID is already registered
// once, by the home window.
(function () {
  class IpcSignalingShim extends EventTarget {
    constructor() {
      super()
      window.rdp.on('signal-to-viewer', (msg) => {
        this.dispatchEvent(new CustomEvent('message', { detail: msg }))
      })
    }

    sendSignal(type, toId, payload) {
      window.rdp.send('viewer-signal-out', { type, toId, payload })
    }

    // The viewer never initiates a connect-request or accept/reject itself —
    // the home window already completed that handshake before handing off.
    requestConnection() {}
    respondToRequest() {}
  }

  window.RDP = window.RDP || {}
  window.RDP.IpcSignalingShim = IpcSignalingShim
})()
