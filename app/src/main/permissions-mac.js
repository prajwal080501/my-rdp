const { systemPreferences } = require('electron')

// No-ops (always "granted") on Windows/Linux — these two permissions are a
// macOS-only concept. Best-effort only: this machine can't run macOS to
// verify the prompts actually surface correctly, but the APIs themselves are
// standard Electron and match Apple's documented behavior.
function hasAccessibilityPermission({ prompt = false } = {}) {
  if (process.platform !== 'darwin') return true
  return systemPreferences.isTrustedAccessibilityClient(prompt)
}

function hasScreenRecordingPermission() {
  if (process.platform !== 'darwin') return true
  return systemPreferences.getMediaAccessStatus('screen') === 'granted'
}

module.exports = { hasAccessibilityPermission, hasScreenRecordingPermission }
