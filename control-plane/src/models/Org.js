const { Schema, model } = require('mongoose')

const orgSchema = new Schema({
  name: { type: String, required: true }
}, { timestamps: true })

module.exports = model('Org', orgSchema)
