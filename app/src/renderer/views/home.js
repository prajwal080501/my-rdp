(function () {
  function initHomeView({ deviceId, onConnect }) {
    const yourIdEl = document.getElementById('your-id')
    const remoteIdInput = document.getElementById('remote-id-input')
    const connectBtn = document.getElementById('connect-btn')

    yourIdEl.textContent = deviceId

    connectBtn.addEventListener('click', () => {
      const targetId = remoteIdInput.value.trim()
      if (targetId) onConnect(targetId)
    })

    return {
      setVisible(visible) {
        document.getElementById('home-view').classList.toggle('hidden', !visible)
      }
    }
  }

  window.RDP = window.RDP || {}
  window.RDP.initHomeView = initHomeView
})()
