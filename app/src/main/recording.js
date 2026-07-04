const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { app } = require('electron')
const controlPlane = require('./control-plane-client')

// sessionId -> { stream, filePath, startedAt }. The viewer renderer streams
// MediaRecorder chunks over IPC (same chunked-write pattern as
// file-transfer.js) since it can't touch the filesystem directly.
const activeRecordings = new Map()

function tempDir() {
  const dir = path.join(app.getPath('temp'), 'beam-recordings')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function start(sessionId) {
  const filePath = path.join(tempDir(), `${sessionId}.webm`)
  const stream = fs.createWriteStream(filePath)
  activeRecordings.set(sessionId, { stream, filePath, startedAt: Date.now() })
}

function chunk(sessionId, data) {
  const rec = activeRecordings.get(sessionId)
  if (!rec) return
  rec.stream.write(Buffer.from(data))
}

// Uploads the finished recording to the S3-compatible bucket control-plane
// is configured against, registers it on the session, then discards the
// local temp copy — recordings live centrally, not per-machine.
async function stop(sessionId) {
  const rec = activeRecordings.get(sessionId)
  if (!rec) return
  activeRecordings.delete(sessionId)

  await new Promise((resolve) => rec.stream.end(resolve))

  try {
    const buffer = fs.readFileSync(rec.filePath)
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')
    const durationMs = Date.now() - rec.startedAt

    const { uploadUrl, objectKey } = await controlPlane.post('/recordings/upload-url', {
      sessionId,
      contentType: 'video/webm'
    })

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/webm' },
      body: buffer
    })
    if (!uploadRes.ok) throw new Error(`Recording upload failed: ${uploadRes.status}`)

    await controlPlane.post('/recordings/complete', {
      sessionId, objectKey, sha256, durationMs, sizeBytes: buffer.length
    })
  } catch (err) {
    console.error('recording upload failed:', err.message)
  } finally {
    fs.unlink(rec.filePath, () => {})
  }
}

module.exports = { start, chunk, stop }
