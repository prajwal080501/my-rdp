require('dotenv').config()
const { WebSocketServer } = require('ws')
const { getIceServers } = require('./turn-credentials')

const PORT = process.env.PORT || 8080

// id -> WebSocket. In-memory only: this server relays handshake messages
// (registration, connect requests, SDP/ICE) and never touches media or passwords.
const peers = new Map()

const wss = new WebSocketServer({ port: PORT })

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg))
}

wss.on('connection', (ws) => {
  ws.deviceId = null
  ws.isAlive = true
  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    switch (msg.type) {
      case 'register': {
        if (peers.has(msg.id)) {
          send(ws, { type: 'error', message: 'ID already online' })
          ws.close()
          return
        }
        ws.deviceId = msg.id
        peers.set(msg.id, ws)
        send(ws, { type: 'registered', id: msg.id, iceServers: getIceServers(msg.id) })
        break
      }

      case 'connect-request': {
        const target = peers.get(msg.targetId)
        if (!target) {
          send(ws, { type: 'error', message: `${msg.targetId} is not online` })
          return
        }
        send(target, { type: 'incoming-request', fromId: msg.fromId })
        break
      }

      case 'accept':
      case 'reject': {
        const requester = peers.get(msg.targetId)
        if (msg.type === 'accept') {
          ws.partnerId = msg.targetId
          if (requester) requester.partnerId = ws.deviceId
        }
        send(requester, { type: msg.type === 'accept' ? 'accepted' : 'rejected' })
        break
      }

      case 'sdp-offer':
      case 'sdp-answer':
      case 'ice-candidate': {
        const target = peers.get(msg.toId)
        send(target, { type: msg.type, payload: msg.payload, fromId: ws.deviceId })
        break
      }

      default:
        break
    }
  })

  ws.on('close', () => {
    if (!ws.deviceId) return
    peers.delete(ws.deviceId)
    if (ws.partnerId) send(peers.get(ws.partnerId), { type: 'peer-disconnected' })
  })
})

// Connections can die without a clean TCP close (common behind proxies like
// Render/Cloudflare), which would otherwise leave a registered ID stuck
// forever. Ping periodically and drop anything that doesn't answer.
const HEARTBEAT_INTERVAL_MS = 30000

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      if (ws.deviceId) peers.delete(ws.deviceId)
      ws.terminate()
      continue
    }
    ws.isAlive = false
    ws.ping()
  }
}, HEARTBEAT_INTERVAL_MS)

wss.on('close', () => clearInterval(heartbeat))

console.log(`Signaling server listening on port ${PORT}`)
