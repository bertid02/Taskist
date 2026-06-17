// A tiny synthesized completion chime — no audio asset, no dependency. Browsers
// require a user gesture before audio plays, so call unlockAudio() from an
// interaction (we do it on first input in App); playChime() then no-ops silently
// if the context never got unlocked (e.g. completion fired in a cold background tab).

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  return ctx
}

export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

export function playChime() {
  const c = getCtx()
  if (!c || c.state !== 'running') return
  try {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = 'sine'
    osc.frequency.value = 660
    const t = c.currentTime
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    osc.start(t)
    osc.stop(t + 0.55)
  } catch {
    // ignore — audio is a non-essential enhancement
  }
}
