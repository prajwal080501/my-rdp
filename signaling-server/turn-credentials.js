// Open Relay Project (metered.ca) publishes these as free, publicly shared
// TURN credentials for personal/small-scale use — no account or hosting
// needed. They're rate-limited and not guaranteed uptime; swap in a private
// Metered API key (or self-hosted coturn) later if you outgrow them.
const PUBLIC_TURN_SERVERS = [
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]

function getIceServers() {
  return [{ urls: 'stun:stun.l.google.com:19302' }, ...PUBLIC_TURN_SERVERS]
}

module.exports = { getIceServers }
