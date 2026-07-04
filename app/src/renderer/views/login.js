(function () {
  const DEFAULT_CONTROL_PLANE_URL = 'http://localhost:4000'

  function initLoginView({ onLogin }) {
    const urlInput = document.getElementById('control-plane-url')
    const emailInput = document.getElementById('login-email')
    const passwordInput = document.getElementById('login-password')
    const loginBtn = document.getElementById('login-btn')
    const errorEl = document.getElementById('login-error')

    urlInput.value = localStorage.getItem('controlPlaneUrl') || DEFAULT_CONTROL_PLANE_URL

    loginBtn.addEventListener('click', async () => {
      errorEl.textContent = ''
      const controlPlaneUrl = urlInput.value.trim()
      const email = emailInput.value.trim()
      const password = passwordInput.value

      try {
        localStorage.setItem('controlPlaneUrl', controlPlaneUrl)
        const user = await window.rdp.login({ controlPlaneUrl, email, password })
        onLogin(user)
      } catch (err) {
        errorEl.textContent = err.message
      }
    })
  }

  window.RDP = window.RDP || {}
  window.RDP.initLoginView = initLoginView
})()
