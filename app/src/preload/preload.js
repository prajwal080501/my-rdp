const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('rdp', {
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  getDeviceId: () => ipcRenderer.invoke('get-device-id')
})
