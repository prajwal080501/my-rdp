const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { app } = require('electron')

let cachedId = null

function generateId() {
  // 9-digit numeric ID, AnyDesk-style — easy to read/type over a phone call.
  return String(crypto.randomInt(100000000, 999999999))
}

function getDeviceId() {
  if (cachedId) return cachedId

  const filePath = path.join(app.getPath('userData'), 'device-id.json')

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (data.id) {
      cachedId = data.id
      return cachedId
    }
  } catch {
    // No existing ID yet — fall through and create one.
  }

  cachedId = generateId()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify({ id: cachedId }))
  return cachedId
}

module.exports = { getDeviceId }
