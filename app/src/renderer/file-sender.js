// Drag-and-drop file sending for the viewer window. Runs entirely over the
// dedicated 'file-transfer' DataChannel (never input-fast/input-reliable), so
// a large transfer can't add latency to mouse/keyboard control — the one
// thing AnyDesk is notorious for getting wrong.
(function () {
  const CHUNK_SIZE = 16384
  // Backpressure watermark: pause reading more of the file once this much is
  // still buffered on the wire, resume once the channel drains below it.
  const BUFFERED_AMOUNT_LOW_THRESHOLD = 1 * 1024 * 1024

  let nextId = 1
  let sendQueue = Promise.resolve()

  function attachFileDropZone(dropEl, overlayEl, getChannel, onProgress) {
    let dragDepth = 0

    dropEl.addEventListener('dragenter', (event) => {
      event.preventDefault()
      dragDepth++
      overlayEl.classList.add('visible')
    })

    dropEl.addEventListener('dragover', (event) => {
      event.preventDefault()
    })

    dropEl.addEventListener('dragleave', (event) => {
      event.preventDefault()
      dragDepth = Math.max(0, dragDepth - 1)
      if (dragDepth === 0) overlayEl.classList.remove('visible')
    })

    dropEl.addEventListener('drop', (event) => {
      event.preventDefault()
      dragDepth = 0
      overlayEl.classList.remove('visible')

      const channel = getChannel()
      if (!channel || channel.readyState !== 'open') {
        onProgress({ type: 'error', message: 'Not connected — cannot send files.' })
        return
      }

      const files = Array.from(event.dataTransfer.files)
      // Queued serially (not in parallel) so file-start/chunks/file-end for
      // one file never interleave with another's on the same channel.
      for (const file of files) {
        sendQueue = sendQueue.then(() => sendFile(file, channel, onProgress))
      }
    })
  }

  async function waitForDrain(channel) {
    if (channel.bufferedAmount <= BUFFERED_AMOUNT_LOW_THRESHOLD) return
    await new Promise((resolve) => channel.addEventListener('bufferedamountlow', resolve, { once: true }))
  }

  async function sendFile(file, channel, onProgress) {
    const id = nextId++
    channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD

    channel.send(JSON.stringify({ t: 'file-start', id, name: file.name, size: file.size }))
    onProgress({ type: 'start', id, name: file.name, size: file.size })

    let offset = 0
    while (offset < file.size) {
      await waitForDrain(channel)
      const buffer = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer()
      channel.send(buffer)
      offset += buffer.byteLength
      onProgress({ type: 'progress', id, name: file.name, sent: offset, size: file.size })
    }

    channel.send(JSON.stringify({ t: 'file-end', id }))
    onProgress({ type: 'done', id, name: file.name, size: file.size })
    window.rdp.send('report-audit-event', { type: 'file_transfer.sent', payload: { name: file.name, sizeBytes: file.size } })
  }

  window.RDP = window.RDP || {}
  window.RDP.attachFileDropZone = attachFileDropZone
})()
