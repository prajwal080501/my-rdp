const { Schema, model } = require('mongoose')

// Append-only: nothing in this codebase should ever update or delete an
// AuditEvent document once written.
const auditEventSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  deviceId: { type: String },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
})

auditEventSchema.index({ orgId: 1, createdAt: -1 })

module.exports = model('AuditEvent', auditEventSchema)
