const { ipcMain } = require('electron')
const { getScreenSources } = require('./capture')
const { getDeviceId } = require('./device-id')
const inputInjector = require('./input-injector')
const { registerFileTransferHandlers } = require('./file-transfer')
const auth = require('./auth')
const audit = require('./audit')
const sessions = require('./sessions')
const recording = require('./recording')
const { CONTROL_PLANE_URL } = require('./config')

function registerIpcHandlers() {
  ipcMain.handle('get-screen-sources', () => getScreenSources())
  ipcMain.handle('get-device-id', () => getDeviceId())
  ipcMain.handle('get-control-plane-url', () => CONTROL_PLANE_URL)

  // Fire-and-forget: input-injector queues and executes these itself so this
  // handler never blocks waiting on the (slower) native OS call.
  ipcMain.on('inject-input', (_event, msg) => inputInjector.dispatch(msg))

  registerFileTransferHandlers()
  registerAuthIpcHandlers()
}

function registerAuthIpcHandlers() {
  ipcMain.handle('auth-get-session', () => auth.getSession())

  ipcMain.handle('auth-login', async (_event, { controlPlaneUrl, email, password }) => {
    const user = await auth.login(controlPlaneUrl, email, password)
    audit.reportEvent('auth.login', { email: user.email })
    return user
  })

  ipcMain.handle('auth-signup', async (_event, { controlPlaneUrl, email, password, orgName }) => {
    const user = await auth.signup(controlPlaneUrl, email, password, orgName)
    audit.reportEvent('auth.signup', { email: user.email, orgName })
    return user
  })

  ipcMain.handle('auth-logout', async () => {
    audit.reportEvent('auth.logout')
    await auth.logout()
  })

  ipcMain.handle('auth-get-device-token', async () => {
    const deviceId = getDeviceId()
    const { deviceToken, freshlyRegistered } = await auth.getDeviceToken(deviceId)
    if (freshlyRegistered) audit.reportEvent('device.registered', { deviceId })
    return deviceToken
  })

  // Generic pass-through so renderer-side business logic (connect requests,
  // accept/reject, session lifecycle) can log to the audit trail without
  // renderer code ever holding a control-plane access token itself.
  ipcMain.on('report-audit-event', (_event, { type, payload }) => audit.reportEvent(type, payload))

  ipcMain.on('session-report-start', (_event, payload) => sessions.reportSessionStart(payload))
  ipcMain.on('session-report-end', (_event, payload) => sessions.reportSessionEnd(payload))

  ipcMain.on('recording-start', (_event, { sessionId }) => recording.start(sessionId))
  ipcMain.on('recording-chunk', (_event, { sessionId, chunk }) => recording.chunk(sessionId, chunk))
  ipcMain.on('recording-stop', (_event, { sessionId }) => recording.stop(sessionId))
}

module.exports = { registerIpcHandlers }
