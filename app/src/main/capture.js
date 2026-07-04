const { desktopCapturer } = require('electron')
const { hasScreenRecordingPermission } = require('./permissions-mac')

async function getScreenSources() {
  if (!hasScreenRecordingPermission()) {
    // desktopCapturer.getSources() silently returns [] without this — surface
    // a message the renderer can show instead of a confusing empty list.
    throw new Error(
      'Screen Recording permission is required. Grant it in System Settings > ' +
      'Privacy & Security > Screen Recording, then restart Beam.'
    )
  }

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 150, height: 150 }
  })

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL()
  }))
}

module.exports = { getScreenSources }
