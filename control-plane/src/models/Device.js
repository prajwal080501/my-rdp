const { Schema, model } = require('mongoose')

const deviceSchema = new Schema({
  deviceId: { type: String, required: true, unique: true },
  orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String },
  lastSeenAt: { type: Date }
}, { timestamps: true })

module.exports = model('Device', deviceSchema)
