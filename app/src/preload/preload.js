const { contextBridge, ipcRenderer } = require('electron')

// Explicit allowlist of channels used to relay WebRTC signaling and session
// lifecycle messages between the home window (owns the signaling socket) and
// the viewer window (owns the outgoing call's RTCPeerConnection).
const OUTGOING_CHANNELS = ['open-viewer', 'viewer-signal-out', 'signal-to-viewer', 'end-viewer-session']
const INCOMING_CHANNELS = ['session-init', 'viewer-signal-out', 'signal-to-viewer', 'viewer-session-ended']

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
