// Captures mouse/keyboard on the viewer window and forwards it to the host
// over the peer connection's DataChannels. Mouse position is normalized to
// the video's actual displayed content area (accounting for object-fit:
// contain letterboxing), so it maps correctly regardless of window size.
(function () {
  function attachInputCapture(videoEl, getChannels) {
    function contentRect() {
      const rect = videoEl.getBoundingClientRect()
      const videoAspect = videoEl.videoWidth / videoEl.videoHeight
      const boxAspect = rect.width / rect.height

      let width, height, offsetX, offsetY
      if (videoAspect > boxAspect) {
        width = rect.width
        height = rect.width / videoAspect
        offsetX = 0
        offsetY = (rect.height - height) / 2
      } else {
        height = rect.height
        width = rect.height * videoAspect
        offsetY = 0
        offsetX = (rect.width - width) / 2
      }
      return { left: rect.left + offsetX, top: rect.top + offsetY, width, height }
    }

    function normalizedPosition(event) {
      const content = contentRect()
      return {
        x: Math.min(Math.max((event.clientX - content.left) / content.width, 0), 1),
        y: Math.min(Math.max((event.clientY - content.top) / content.height, 0), 1)
      }
    }

    function send(label, message) {
      const channel = getChannels()[label]
      if (channel && channel.readyState === 'open') channel.send(JSON.stringify(message))
    }

    videoEl.style.userSelect = 'none'
    videoEl.draggable = false

    videoEl.addEventListener('mousemove', (event) => {
      const { x, y } = normalizedPosition(event)
      send('input-fast', { t: 'mm', x, y })
    })

    videoEl.addEventListener('mousedown', (event) => {
      event.preventDefault()
      const { x, y } = normalizedPosition(event)
      send('input-reliable', { t: 'md', x, y, button: event.button })
    })

    videoEl.addEventListener('mouseup', (event) => {
      const { x, y } = normalizedPosition(event)
      send('input-reliable', { t: 'mu', x, y, button: event.button })
    })

    videoEl.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
        send('input-fast', { t: 'wh', dx: event.deltaX, dy: event.deltaY })
      },
      { passive: false }
    )

    videoEl.addEventListener('contextmenu', (event) => event.preventDefault())

    // Window-level (not element-level) so focus doesn't matter — this
    // window's only purpose while a call is active is remote-controlling
    // the host, so all keyboard input goes there.
    window.addEventListener('keydown', (event) => {
      event.preventDefault()
      send('input-reliable', { t: 'kd', code: event.code })
    })

    window.addEventListener('keyup', (event) => {
      event.preventDefault()
      send('input-reliable', { t: 'ku', code: event.code })
    })
  }

  window.RDP = window.RDP || {}
  window.RDP.attachInputCapture = attachInputCapture
})()
