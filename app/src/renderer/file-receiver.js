// Host-side receiver for incoming file-transfer traffic. Only tracks the
// current transfer's bookkeeping here; the actual fs writes happen in main
// (see main/file-transfer.js) since a renderer can't touch the filesystem.
(function () {
  function wireFileReceiver(channel, setStatus) {
    channel.binaryType = 'arraybuffer'
    let current = null

    channel.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data)
        if (msg.t === 'file-start') {
          current = { id: msg.id, name: msg.name, size: msg.size, received: 0 }
          window.rdp.send('file-transfer-start', { id: msg.id, name: msg.name, size: msg.size })
          setStatus(`Receiving ${msg.name}...`)
        } else if (msg.t === 'file-end' && current) {
          window.rdp.send('file-transfer-end', { id: current.id })
          current = null
        }
        return
      }

      if (!current) return
      current.received += event.data.byteLength
      window.rdp.send('file-transfer-chunk', { id: current.id, chunk: event.data })
      const pct = Math.round((current.received / current.size) * 100)
      setStatus(`Receiving ${current.name}... ${pct}%`)
    })

    window.rdp.on('file-transfer-complete', ({ name, filePath }) => {
      setStatus(`Received "${name}" -> ${filePath}`)
    })
  }

  window.RDP = window.RDP || {}
  window.RDP.wireFileReceiver = wireFileReceiver
})()
