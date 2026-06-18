import type { PomodoroPrefs, PomodoroSession, PomoPhase } from '../types'

export const SESSION_KEY = 'taskist.pomodoro.v1'

/** Length of a given phase in milliseconds, from the user's prefs. Floored at one
 * minute so a corrupt/hand-edited 0 can't create an instant-complete loop. */
export function phaseDurationMs(prefs: PomodoroPrefs, phase: PomoPhase): number {
  const min =
    phase === 'work'
      ? prefs.workMin
      : phase === 'longBreak'
        ? prefs.longBreakMin
        : prefs.shortBreakMin
  return Math.max(60_000, Math.round(min * 60_000))
}

/**
 * The phase that follows a completed one, plus the updated completed-work count.
 * A work block bumps the count and yields a long break every `longBreakEvery`-th
 * time; a break always returns to work and leaves the count untouched.
 */
export function nextPhase(
  session: PomodoroSession,
  prefs: PomodoroPrefs,
): { phase: PomoPhase; completedWork: number } {
  if (session.phase === 'work') {
    const completedWork = session.completedWork + 1
    const isLong = prefs.longBreakEvery > 0 && completedWork % prefs.longBreakEvery === 0
    return { phase: isLong ? 'longBreak' : 'shortBreak', completedWork }
  }
  return { phase: 'work', completedWork: session.completedWork }
}

/** Milliseconds left in the session, clamped at zero. Pure: caller passes `now`. */
export function remainingMs(session: PomodoroSession, now: number): number {
  if (!session.running) return Math.max(0, session.pausedRemainingMs ?? 0)
  return Math.max(0, session.endsAt - now)
}

/** Render milliseconds as M:SS (or MM:SS), rounding up so the last second shows 0:01. */
export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function loadSession(): PomodoroSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PomodoroSession
    if (!parsed || typeof parsed.endsAt !== 'number' || typeof parsed.phase !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: PomodoroSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore quota / availability errors
  }
}

export function clearSession() {
  saveSession(null)
}
