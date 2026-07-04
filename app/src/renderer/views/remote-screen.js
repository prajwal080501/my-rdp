(function () {
  function initRemoteView({ onDisconnect }) {
    const videoEl = document.getElementById('remote-screen-video')
    const viewEl = document.getElementById('remote-view')

    document.getElementById('disconnect-btn').addEventListener('click', () => onDisconnect())

    return {
      setVisible(visible) {
        viewEl.classList.toggle('hidden', !visible)
      },
      showStream(stream) {
        videoEl.srcObject = stream
      },
      clear() {
        videoEl.srcObject = null
      }
    }
  }

  window.RDP = window.RDP || {}
  window.RDP.initRemoteView = initRemoteView
})()
