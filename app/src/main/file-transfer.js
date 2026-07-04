const { ipcMain, app, Notification } = require('electron')
const fs = require('fs')
const path = require('path')

// id -> { stream, filePath, name, sender }
const activeTransfers = new Map()

function transfersDir() {
  const dir = path.join(app.getPath('downloads'), 'Beam Transfers')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function sanitizeFileName(name) {
  return path.basename(name).replace(/[\\/:*?"<>|]/g, '_')
}

// Avoids clobbering an existing file of the same name from a prior transfer.
function uniquePath(dir, name) {
  const ext = path.extname(name)
  const base = path.basename(name, ext)
  let candidate = path.join(dir, name)
  let n = 1
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${n})${ext}`)
    n++
  }
  return candidate
}

function registerFileTransferHandlers() {
  ipcMain.on('file-transfer-start', (event, { id, name }) => {
    const safeName = sanitizeFileName(name)
    const filePath = uniquePath(transfersDir(), safeName)
    const stream = fs.createWriteStream(filePath)
    activeTransfers.set(id, { stream, filePath, name: safeName, sender: event.sender })
  })

  ipcMain.on('file-transfer-chunk', (_event, { id, chunk }) => {
    const transfer = activeTransfers.get(id)
    if (!transfer) return
    transfer.stream.write(Buffer.from(chunk))
  })

  ipcMain.on('file-transfer-end', (_event, { id }) => {
    const transfer = activeTransfers.get(id)
    if (!transfer) return
    activeTransfers.delete(id)
    transfer.stream.end(() => {
      if (Notification.isSupported()) {
        new Notification({ title: 'Beam', body: `Received "${transfer.name}"` }).show()
      }
      if (!transfer.sender.isDestroyed()) {
        transfer.sender.send('file-transfer-complete', { name: transfer.name, filePath: transfer.filePath })
      }
    })
  })
}

module.exports = { registerFileTransferHandlers }
