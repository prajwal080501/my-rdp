const { mouse, keyboard, screen, Point, Button, Key } = require('@nut-tree-fork/nut-js')
const { hasAccessibilityPermission } = require('./permissions-mac')

// Zero out nut.js's default inter-event delay — we already get a natural
// pace from the browser's own event rate, adding more here only costs latency.
mouse.config.autoDelayMs = 0
keyboard.config.autoDelayMs = 0

// macOS silently no-ops synthetic input without this — checked (and, if
// needed, prompted for) once, on the first actual injection attempt rather
// than at startup, so the OS prompt is tied to an actual incoming connection.
let accessibilityChecked = false
function ensureAccessibilityPermission() {
  if (accessibilityChecked) return
  accessibilityChecked = true
  if (!hasAccessibilityPermission({ prompt: true })) {
    console.error(
      'Accessibility permission not granted — remote input will not work. ' +
      'Grant it in System Settings > Privacy & Security > Accessibility, then restart Beam.'
    )
  }
}

const BUTTON_MAP = { 0: Button.LEFT, 1: Button.MIDDLE, 2: Button.RIGHT }

// Maps browser KeyboardEvent.code (layout-independent) to nut.js's Key enum.
const CODE_TO_KEY = {
  KeyA: Key.A, KeyB: Key.B, KeyC: Key.C, KeyD: Key.D, KeyE: Key.E, KeyF: Key.F,
  KeyG: Key.G, KeyH: Key.H, KeyI: Key.I, KeyJ: Key.J, KeyK: Key.K, KeyL: Key.L,
  KeyM: Key.M, KeyN: Key.N, KeyO: Key.O, KeyP: Key.P, KeyQ: Key.Q, KeyR: Key.R,
  KeyS: Key.S, KeyT: Key.T, KeyU: Key.U, KeyV: Key.V, KeyW: Key.W, KeyX: Key.X,
  KeyY: Key.Y, KeyZ: Key.Z,

  Digit1: Key.Num1, Digit2: Key.Num2, Digit3: Key.Num3, Digit4: Key.Num4,
  Digit5: Key.Num5, Digit6: Key.Num6, Digit7: Key.Num7, Digit8: Key.Num8,
  Digit9: Key.Num9, Digit0: Key.Num0,

  Numpad0: Key.NumPad0, Numpad1: Key.NumPad1, Numpad2: Key.NumPad2, Numpad3: Key.NumPad3,
  Numpad4: Key.NumPad4, Numpad5: Key.NumPad5, Numpad6: Key.NumPad6, Numpad7: Key.NumPad7,
  Numpad8: Key.NumPad8, Numpad9: Key.NumPad9,
  NumpadAdd: Key.Add, NumpadSubtract: Key.Subtract, NumpadMultiply: Key.Multiply,
  NumpadDivide: Key.Divide, NumpadDecimal: Key.Decimal, NumpadEqual: Key.NumPadEqual,
  NumpadEnter: Key.Enter,

  F1: Key.F1, F2: Key.F2, F3: Key.F3, F4: Key.F4, F5: Key.F5, F6: Key.F6,
  F7: Key.F7, F8: Key.F8, F9: Key.F9, F10: Key.F10, F11: Key.F11, F12: Key.F12,

  ShiftLeft: Key.LeftShift, ShiftRight: Key.RightShift,
  ControlLeft: Key.LeftControl, ControlRight: Key.RightControl,
  AltLeft: Key.LeftAlt, AltRight: Key.RightAlt,
  MetaLeft: Key.LeftSuper, MetaRight: Key.RightSuper,

  ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,
  Home: Key.Home, End: Key.End, PageUp: Key.PageUp, PageDown: Key.PageDown,
  Insert: Key.Insert, Delete: Key.Delete,

  Space: Key.Space, Enter: Key.Enter, Escape: Key.Escape, Tab: Key.Tab,
  Backspace: Key.Backspace, CapsLock: Key.CapsLock, ContextMenu: Key.Menu,
  NumLock: Key.NumLock, ScrollLock: Key.ScrollLock, PrintScreen: Key.Print, Pause: Key.Pause,

  Backquote: Key.Grave, Minus: Key.Minus, Equal: Key.Equal,
  BracketLeft: Key.LeftBracket, BracketRight: Key.RightBracket, Backslash: Key.Backslash,
  Semicolon: Key.Semicolon, Quote: Key.Quote, Comma: Key.Comma, Period: Key.Period, Slash: Key.Slash
}

let cachedScreenSize = null

async function getScreenSize() {
  if (!cachedScreenSize) {
    cachedScreenSize = { width: await screen.width(), height: await screen.height() }
  }
  return cachedScreenSize
}

async function moveMouse(xPct, yPct) {
  const { width, height } = await getScreenSize()
  const x = Math.round(Math.min(Math.max(xPct, 0), 1) * width)
  const y = Math.round(Math.min(Math.max(yPct, 0), 1) * height)
  await mouse.setPosition(new Point(x, y))
}

async function mouseButtonEvent(action, button) {
  const btn = BUTTON_MAP[button]
  if (btn === undefined) return
  if (action === 'down') await mouse.pressButton(btn)
  else await mouse.releaseButton(btn)
}

async function scroll(deltaX, deltaY) {
  if (deltaY) {
    if (deltaY > 0) await mouse.scrollDown(Math.round(deltaY))
    else await mouse.scrollUp(Math.round(-deltaY))
  }
  if (deltaX) {
    if (deltaX > 0) await mouse.scrollRight(Math.round(deltaX))
    else await mouse.scrollLeft(Math.round(-deltaX))
  }
}

async function keyEvent(action, code) {
  const key = CODE_TO_KEY[code]
  if (key === undefined) return
  if (action === 'down') await keyboard.pressKey(key)
  else await keyboard.releaseKey(key)
}

// Each message executes in arrival order via a serial queue, without making
// the IPC handler itself wait on the (slower) native OS call. Mouse-move is
// special-cased: under heavy movement, events can arrive faster than the OS
// call completes, and queuing every single one would make the cursor lag
// further and further behind. Instead we coalesce to "only the latest
// position matters" — exactly why input-fast is also an unordered/unreliable
// channel end to end.
let queue = Promise.resolve()
let latestMouseMove = null
let mouseMoveQueued = false

function dispatch(msg) {
  ensureAccessibilityPermission()

  if (msg.t === 'mm') {
    latestMouseMove = msg
    if (mouseMoveQueued) return
    mouseMoveQueued = true
    queue = queue
      .then(() => {
        const { x, y } = latestMouseMove
        mouseMoveQueued = false
        return moveMouse(x, y)
      })
      .catch((err) => console.error('input-injector error:', err))
    return
  }

  queue = queue.then(() => handle(msg)).catch((err) => console.error('input-injector error:', err))
}

async function handle(msg) {
  switch (msg.t) {
    case 'md':
      // Position travels with the click itself (reliable channel) rather
      // than relying on the last input-fast move having arrived — clicks
      // must always land exactly where intended, even under packet loss.
      await moveMouse(msg.x, msg.y)
      return mouseButtonEvent('down', msg.button)
    case 'mu':
      await moveMouse(msg.x, msg.y)
      return mouseButtonEvent('up', msg.button)
    case 'wh':
      return scroll(msg.dx, msg.dy)
    case 'kd':
      return keyEvent('down', msg.code)
    case 'ku':
      return keyEvent('up', msg.code)
    default:
      return undefined
  }
}

module.exports = { getScreenSize, moveMouse, mouseButtonEvent, scroll, keyEvent, dispatch }
