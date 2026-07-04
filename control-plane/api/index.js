require('dotenv').config()

// Vercel's Node runtime treats a default-exported Express app as a request
// handler directly — no app.listen() here, and no explicit DB connect either
// (src/app.js's middleware handles that per-request, cached across warm
// invocations of this same function instance).
module.exports = require('../src/app')
