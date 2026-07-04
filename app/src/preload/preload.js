const { contextBridge, ipcRenderer } = require('electron')

// Explicit allowlist of channels used to relay WebRTC signaling/session
// lifecycle messages between windows, plus input injection and incoming
// file-transfer writes, both of which the home window (host role) forwards
// to main since neither nut.js nor fs are reachable directly from a renderer.
const OUTGOING_CHANNELS = [
  'open-viewer',
  'viewer-signal-out',
  'signal-to-viewer',
  'end-viewer-session',
  'inject-input',
  'file-transfer-start',
  'file-transfer-chunk',
  'file-transfer-end'
]
const INCOMING_CHANNELS = [
  'session-init',
  'viewer-signal-out',
  'signal-to-viewer',
  'viewer-session-ended',
  'file-transfer-complete'
]

contextBridge.exposeInMainWorld('rdp', {
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),

  send: (channel, payload) => {
    if (!OUTGOING_CHANNELS.includes(channel)) throw new Error(`Blocked outgoing IPC channel: ${channel}`)
    ipcRenderer.send(channel, payload)
  },

  on: (channel, handler) => {
    if (!INCOMING_CHANNELS.includes(channel)) throw new Error(`Blocked incoming IPC channel: ${channel}`)
    ipcRenderer.on(channel, (_event, payload) => handler(payload))
  }
})
