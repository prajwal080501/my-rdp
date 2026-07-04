const { Router } = require('express')
const Session = require('../models/Session')
const { getUploadUrl } = require('../lib/s3')
const { requireAuth } = require('../middleware/auth')

const router = Router()

router.post('/upload-url', requireAuth, async (req, res) => {
  const { sessionId, contentType } = req.body
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' })

  const session = await Session.findOne({ sessionId, orgId: req.user.orgId })
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const objectKey = `${req.user.orgId}/${sessionId}/recording.webm`
  const uploadUrl = await getUploadUrl(objectKey, contentType || 'video/webm')
  res.json({ uploadUrl, objectKey })
})

router.post('/complete', requireAuth, async (req, res) => {
  const { sessionId, objectKey, sha256, durationMs, sizeBytes } = req.body
  if (!sessionId || !objectKey) return res.status(400).json({ error: 'sessionId and objectKey are required' })

  const session = await Session.findOneAndUpdate(
    { sessionId, orgId: req.user.orgId },
    { recording: { objectKey, sha256, durationMs, sizeBytes } },
    { new: true }
  )
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json({ session })
})

module.exports = router
