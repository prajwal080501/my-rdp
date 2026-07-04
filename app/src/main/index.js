const { app, BrowserWindow } = require('electron')
const { registerIpcHandlers } = require('./ipc-handlers')
const { createHomeWindow, registerWindowIpcHandlers } = require('./windows')

app.whenReady().then(() => {
  registerIpcHandlers()
  registerWindowIpcHandlers()
  createHomeWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createHomeWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
