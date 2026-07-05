const { Router } = require('express')
const mongoose = require('mongoose')
const { connectDb } = require('../db')
const { headBucket } = require('../lib/s3')

const router = Router()

const MONGO_TIMEOUT_MS = 5000
const S3_TIMEOUT_MS = 5000

const REQUIRED_ENV_VARS = [
  'MONGO_URI',
  'JWT_SECRET',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY'
]

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
  ])
}

// Deliberately bounded and mounted ahead of the app-wide DB-connect
// middleware (see app.js) — a health check that can itself hang forever on a
// broken dependency defeats the point of having one. Each check reports its
// own status independently so a single slow dependency doesn't mask the rest.
router.get('/', async (req, res) => {
  const checks = {}

  const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name])
  checks.env = missingEnvVars.length === 0
    ? { ok: true }
    : { ok: false, missing: missingEnvVars }

  try {
    await withTimeout(connectDb(), MONGO_TIMEOUT_MS, 'mongo connect')
    await withTimeout(mongoose.connection.db.admin().ping(), MONGO_TIMEOUT_MS, 'mongo ping')
    checks.mongo = { ok: true }
  } catch (err) {
    checks.mongo = { ok: false, error: err.message }
  }

  try {
    await withTimeout(headBucket(), S3_TIMEOUT_MS, 's3 head-bucket')
    checks.s3 = { ok: true }
  } catch (err) {
    checks.s3 = { ok: false, error: err.message }
  }

  const healthy = Object.values(checks).every((check) => check.ok)
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  })
})

module.exports = router
