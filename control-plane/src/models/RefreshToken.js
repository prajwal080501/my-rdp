const { Schema, model } = require('mongoose')

const refreshTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date }
}, { timestamps: true })

module.exports = model('RefreshToken', refreshTokenSchema)
