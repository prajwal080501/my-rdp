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
  }

  window.RDP = window.RDP || {}
  window.RDP.initHomeView = initHomeView
})()
