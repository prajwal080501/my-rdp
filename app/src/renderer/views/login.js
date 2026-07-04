(function () {
  // Fixed rather than user-configurable: Beam ships pointed at the operator's
  // own deployed control plane, not a URL end users type in themselves.
  const CONTROL_PLANE_URL = 'https://api-beam.vercel.app'

  function initLoginView({ onLogin }) {
    const emailInput = document.getElementById('login-email')
    const passwordInput = document.getElementById('login-password')
    const loginBtn = document.getElementById('login-btn')
    const errorEl = document.getElementById('login-error')

    loginBtn.addEventListener('click', async () => {
      errorEl.textContent = ''
      const email = emailInput.value.trim()
      const password = passwordInput.value

      try {
        const user = await window.rdp.login({ controlPlaneUrl: CONTROL_PLANE_URL, email, password })
        onLogin(user)
      } catch (err) {
        errorEl.textContent = err.message
      }
    })
  }

  window.RDP = window.RDP || {}
  window.RDP.initLoginView = initLoginView
})()
