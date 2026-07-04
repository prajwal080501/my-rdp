(function () {
  // Fixed rather than user-configurable: Beam ships pointed at the operator's
  // own deployed control plane, not a URL end users type in themselves.
  const CONTROL_PLANE_URL = 'https://api-beam.vercel.app'

  function initLoginView({ onLogin }) {
    const orgGroup = document.getElementById('signup-org-group')
    const orgInput = document.getElementById('signup-org-name')
    const emailInput = document.getElementById('login-email')
    const passwordInput = document.getElementById('login-password')
    const submitBtn = document.getElementById('login-submit-btn')
    const errorEl = document.getElementById('login-error')
    const modeToggle = document.getElementById('auth-mode-toggle')

    // Create Account only ever succeeds for the very first user on a fresh
    // control-plane deployment — it bootstraps that org and its owner, then
    // disables itself server-side. Every account after that comes from an
    // owner/admin inviting a teammate, not this form.
    let mode = 'login'

    function applyMode() {
      const isSignup = mode === 'signup'
      orgGroup.classList.toggle('hidden', !isSignup)
      submitBtn.textContent = isSignup ? 'Create account' : 'Log in'
      modeToggle.textContent = isSignup ? 'Already have an account? Log in' : 'Need an account? Create one'
      errorEl.textContent = ''
    }

    modeToggle.addEventListener('click', (event) => {
      event.preventDefault()
      mode = mode === 'login' ? 'signup' : 'login'
      applyMode()
    })

    submitBtn.addEventListener('click', async () => {
      errorEl.textContent = ''
      const email = emailInput.value.trim()
      const password = passwordInput.value

      try {
        const user = mode === 'signup'
          ? await window.rdp.signup({ controlPlaneUrl: CONTROL_PLANE_URL, email, password, orgName: orgInput.value.trim() })
          : await window.rdp.login({ controlPlaneUrl: CONTROL_PLANE_URL, email, password })
        onLogin(user)
      } catch (err) {
        errorEl.textContent = err.message
      }
    })

    applyMode()
  }

  window.RDP = window.RDP || {}
  window.RDP.initLoginView = initLoginView
})()
