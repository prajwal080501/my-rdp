const { Schema, model } = require('mongoose')

const ROLES = ['owner', 'admin', 'member']

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  orgId: { type: Schema.Types.ObjectId, ref: 'Org', required: true },
  role: { type: String, enum: ROLES, default: 'member' },
  // Set on admin-created accounts; cleared once the user sets their own password.
  mustChangePassword: { type: Boolean, default: false }
}, { timestamps: true })

module.exports = model('User', userSchema)
module.exports.ROLES = ROLES
