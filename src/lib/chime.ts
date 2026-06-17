// Synthesized timer sounds — no audio asset, no dependency, offline-safe.
// Warm additive bell/marimba voices distinguished by motif (the sonic twin of
// the monochrome palette: soft, short, never alarm-like). Browsers require a
// user gesture before audio plays, so call unlockAudio() from an interaction;
// playSound() then no-ops silently if the context never got unlocked (e.g. a
// completion that fires in a cold background tab).

export type SoundName = 'focusComplete' | 'breakOver' | 'breakOverLong' | 'start'

let ctx: AudioContext | null = null
let dryIn: BiquadFilterNode | null = null // notes connect here (shared lowpass)
let shimmerSend: GainNode | null = null // optional one-tap delay "halo"

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

// Build the shared master chain once (after unlock): notes → lowpass → master → out,
// with a soft feedback-delay shimmer bus for the hero tone.
function ensureChain(c: AudioContext) {
  if (dryIn) return
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2200
  lp.Q.value = 0.7

  const master = c.createGain()
  master.gain.value = 0.5 // deliberately soft

  lp.connect(master)
  master.connect(c.destination)

  const send = c.createGain()
  send.gain.value = 1
  const delay = c.createDelay()
  delay.delayTime.value = 0.16
  const feedback = c.createGain()
  feedback.gain.value = 0.18
  const wet = c.createGain()
  wet.gain.value = 0.06
  send.connect(delay)
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(wet)
  wet.connect(master)

  dryIn = lp
  shimmerSend = send
}

type NoteOpts = {
  peak: number
  attack: number
  decay: number
  detuneCents?: number
  shimmer?: boolean
}

const PARTIALS = [1, 2, 3.01] // fundamental + two overtones (slight detune = life)
const PARTIAL_GAINS = [1, 0.4, 0.16]

function note(c: AudioContext, freq: number, at: number, o: NoteOpts) {
  if (!dryIn) return
  const layers = o.detuneCents ? [0, o.detuneCents] : [0]
  for (const cents of layers) {
    const layerScale = cents === 0 ? 1 : 0.3 // detuned layer is quieter
    PARTIALS.forEach((mult, i) => {
      const osc = c.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * mult
      if (cents) osc.detune.value = cents
      const g = c.createGain()
      osc.connect(g)
      g.connect(dryIn as BiquadFilterNode)
      if (o.shimmer && shimmerSend) g.connect(shimmerSend)
      const peak = Math.max(0.0002, o.peak * PARTIAL_GAINS[i] * layerScale)
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(peak, at + o.attack)
      g.gain.exponentialRampToValueAtTime(0.0001, at + o.attack + o.decay)
      osc.start(at)
      osc.stop(at + o.attack + o.decay + 0.05)
    })
  }
}

export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

export function playSound(name: SoundName) {
  const c = getCtx()
  if (!c || c.state !== 'running') return
  ensureChain(c)
  try {
    const t = c.currentTime
    switch (name) {
      case 'focusComplete': {
        // Rising perfect fifth C5 → G5: warm, resolved, "done well."
        note(c, 523.25, t, { peak: 0.15, attack: 0.008, decay: 0.45, detuneCents: 4, shimmer: true })
        note(c, 783.99, t + 0.13, { peak: 0.15, attack: 0.008, decay: 0.45, detuneCents: 4, shimmer: true })
        break
      }
      case 'breakOver': {
        // Single lower G4 — subordinate to the focus tone, "ease back in."
        note(c, 392.0, t, { peak: 0.14, attack: 0.012, decay: 0.5, detuneCents: 4 })
        break
      }
      case 'breakOverLong': {
        // Gentle descending G4 → C4: settling, grounding after a long rest.
        note(c, 392.0, t, { peak: 0.13, attack: 0.012, decay: 0.5, detuneCents: 4 })
        note(c, 261.63, t + 0.14, { peak: 0.13, attack: 0.012, decay: 0.55, detuneCents: 4 })
        break
      }
      case 'start': {
        // Whisper-quiet low tock — tactile confirmation for keyboard starts.
        note(c, 261.63, t, { peak: 0.06, attack: 0.004, decay: 0.12 })
        break
      }
    }
  } catch {
    // ignore — audio is a non-essential enhancement
  }
}
