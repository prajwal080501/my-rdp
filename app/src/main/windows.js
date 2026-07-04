const { BrowserWindow, ipcMain, app } = require('electron')
const path = require('path')

let homeWindow = null
let viewerWindow = null
let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
})

const preloadPath = path.join(__dirname, '..', 'preload', 'preload.js')

function createHomeWindow() {
  homeWindow = new BrowserWindow({
    width: 480,
    height: 560,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  homeWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  homeWindow.on('closed', () => {
    homeWindow = null
  })

  return homeWindow
}

// Kept alive across window closes: closing this window (the native X button)
// only hides it so an in-progress call keeps running in the background and
// can be reshown later without redoing the connect/accept handshake. Ending
// the call for real (the Disconnect button) destroys it instead — see
// 'end-viewer-session' below.
function getOrCreateViewerWindow() {
  if (viewerWindow && !viewerWindow.isDestroyed()) return viewerWindow

  viewerWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // Hidden (not destroyed) while the user reconnects later — the call
      // must keep running at full rate in the background, not get throttled.
      backgroundThrottling: false
    }
  })

  viewerWindow.loadFile(path.join(__dirname, '..', 'renderer', 'viewer.html'))
  // No File/Edit/View/Window menu needed, and Alt-key mnemonics would
  // otherwise steal keystrokes meant for the remote session.
  viewerWindow.removeMenu()

  viewerWindow.on('close', (event) => {
    if (isQuitting) return
    event.preventDefault()
    viewerWindow.hide()
  })

  viewerWindow.on('closed', () => {
    viewerWindow = null
  })

  return viewerWindow
}

function registerWindowIpcHandlers() {
  // Home window (owner of the signaling WebSocket) asks main to open/show
  // the viewer window once a caller-side connection has been accepted.
  ipcMain.on('open-viewer', (event, payload) => {
    const win = getOrCreateViewerWindow()

    const sendInit = () => win.webContents.send('session-init', payload)
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', sendInit)
    } else {
      sendInit()
    }

    win.show()
    win.focus()
  })

  // Viewer -> home: outgoing signaling messages (the SDP offer/ICE candidates
  // the viewer generates) that must go out over home's WebSocket.
  ipcMain.on('viewer-signal-out', (event, msg) => {
    if (homeWindow && !homeWindow.isDestroyed()) homeWindow.webContents.send('viewer-signal-out', msg)
  })

  // Home -> viewer: incoming signaling messages (sdp-answer/ice-candidate/
  // peer-disconnected) for the call home has delegated to the viewer window.
  ipcMain.on('signal-to-viewer', (event, msg) => {
    if (viewerWindow && !viewerWindow.isDestroyed()) viewerWindow.webContents.send('signal-to-viewer', msg)
  })

  // Viewer's explicit Disconnect button: the call is really over, so destroy
  // the window (rather than just hiding it) and let home know to reset.
  ipcMain.on('end-viewer-session', () => {
    if (homeWindow && !homeWindow.isDestroyed()) homeWindow.webContents.send('viewer-session-ended')
    if (viewerWindow && !viewerWindow.isDestroyed()) viewerWindow.destroy()
  })
}

module.exports = { createHomeWindow, registerWindowIpcHandlers }
