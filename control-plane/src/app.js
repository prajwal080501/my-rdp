const path = require('path')
const express = require('express')
const { connectDb } = require('./db')
const healthRoutes = require('./routes/health')
const authRoutes = require('./routes/auth')
const deviceRoutes = require('./routes/devices')
const sessionRoutes = require('./routes/sessions')
const auditRoutes = require('./routes/audit')
const recordingRoutes = require('./routes/recordings')

const app = express()
app.use(express.json())

// Mounted ahead of the DB-connect gate below: /health does its own
// individually-timed-out checks and must keep working even when the
// database is the thing that's broken, to be useful for diagnosing that.
app.use('/health', healthRoutes)

// Serverless-safe: connectDb() is idempotent, so this is a no-op on every
// request after the first one on a warm lambda instance (see src/db.js).
app.use(async (req, res, next) => {
  try {
    await connectDb()
    next()
  } catch (err) {
    console.error('Database connection failed:', err.message)
    res.status(503).json({ error: 'Database unavailable' })
  }
})

app.use('/auth', authRoutes)
app.use('/devices', deviceRoutes)
app.use('/sessions', sessionRoutes)
app.use('/audit', auditRoutes)
app.use('/recordings', recordingRoutes)

// Minimal static admin page: no build step, calls the APIs above directly
// using a JWT it stores in localStorage after logging in.
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')))

module.exports = app
