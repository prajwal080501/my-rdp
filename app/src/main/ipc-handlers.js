const { ipcMain } = require('electron')
const { getScreenSources } = require('./capture')
const { getDeviceId } = require('./device-id')

function registerIpcHandlers() {
  ipcMain.handle('get-screen-sources', () => getScreenSources())
  ipcMain.handle('get-device-id', () => getDeviceId())
}

module.exports = { registerIpcHandlers }
