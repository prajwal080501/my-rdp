const { ipcMain } = require('electron')
const { getScreenSources } = require('./capture')
const { getDeviceId } = require('./device-id')
const inputInjector = require('./input-injector')
const { registerFileTransferHandlers } = require('./file-transfer')

function registerIpcHandlers() {
  ipcMain.handle('get-screen-sources', () => getScreenSources())
  ipcMain.handle('get-device-id', () => getDeviceId())

  // Fire-and-forget: input-injector queues and executes these itself so this
  // handler never blocks waiting on the (slower) native OS call.
  ipcMain.on('inject-input', (_event, msg) => inputInjector.dispatch(msg))

  registerFileTransferHandlers()
}

module.exports = { registerIpcHandlers }
