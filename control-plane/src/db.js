const mongoose = require('mongoose')

// Idempotent and cached across calls: on Vercel, this module stays warm
// between invocations of the same lambda instance, so a request-scoped
// middleware can call this on every request without reconnecting each time.
let connectionPromise = null

function connectDb() {
  if (mongoose.connection.readyState === 1) return Promise.resolve()

  if (!connectionPromise) {
    const uri = process.env.MONGO_URI
    if (!uri) throw new Error('MONGO_URI is required')
    connectionPromise = mongoose.connect(uri)
      .then(() => console.log('Connected to MongoDB'))
      .catch((err) => {
        connectionPromise = null // let the next request retry instead of caching a failure forever
        throw err
      })
  }
  return connectionPromise
}

module.exports = { connectDb }
