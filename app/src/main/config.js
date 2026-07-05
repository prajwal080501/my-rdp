const { app } = require('electron')

// app.isPackaged is false under `electron .` / `npm start` and true for a
// build produced by electron-builder (dmg/exe/AppImage) — the standard,
// reliable way to tell a dev run apart from a real install.
const CONTROL_PLANE_URL = app.isPackaged
  ? 'https://api-beam.vercel.app'
  : 'http://localhost:4000'

module.exports = { CONTROL_PLANE_URL }
