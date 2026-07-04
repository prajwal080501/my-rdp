const { Schema, model } = require('mongoose')

const sessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  callerDeviceId: { type: String, required: true },
  calleeDeviceId: { type: String, required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  endReason: { type: String },
  recording: {
    objectKey: { type: String },
    sha256: { type: String },
    durationMs: { type: Number },
    sizeBytes: { type: Number }
  }
}, { timestamps: true })

module.exports = model('Session', sessionSchema)
