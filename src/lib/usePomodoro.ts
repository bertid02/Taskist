import { useCallback, useEffect, useRef, useState } from 'react'
import type { PomodoroPrefs, PomodoroSession, PomoPhase } from '../types'
import { todayStr } from './date'
import { playSound } from './chime'
import {
  clearSession,
  loadSession,
  nextPhase,
  phaseDurationMs,
  remainingMs as remainingMsOf,
  saveSession,
  SESSION_KEY,
} from './pomodoro'

export type StartOpts = { phase?: PomoPhase; taskId?: string | null; taskText?: string | null }

export type PomodoroControls = {
  session: PomodoroSession | null
  /** Derived milliseconds remaining in the current phase. */
  remainingMs: number
  /** A finished phase awaiting acknowledgement (e.g. it elapsed while the tab was closed). */
  isDone: boolean
  /** Increments on each natural completion — drives the completion flash. */
  completionSignal: number
  /** Start a focus block. No-op only while a work block is actively running. */
  start: (opts?: StartOpts) => void
  pause: () => void
  resume: () => void
  /** Pause if running, resume if paused, continue if done. No-op when idle. (The `P` key.) */
  toggle: () => void
  /** Jump to the next phase as "ready" without counting or logging the current one. */
  skip: () => void
  /** Start the next phase running now (used to continue from the done state). */
  advance: () => void
  /** Cancel the session entirely. No-op when idle. */
  reset: () => void
}

/**
 * The pomodoro timing engine. Session facts live in their own localStorage key
 * (see lib/pomodoro.ts), written only on transitions — never per tick — so the
 * undo'd Store and its persistence effect are untouched. Remaining time is
 * derived from the absolute `endsAt`, so it stays correct across throttled
 * background tabs, sleep, and reloads.
 */
export function usePomodoro(args: {
  prefs: PomodoroPrefs
  onComplete: (session: PomodoroSession) => void
}): PomodoroControls {
  const [session, setSession] = useState<PomodoroSession | null>(loadSession)
  const [now, setNow] = useState<number>(() => Date.now())
  const [completionSignal, setCompletionSignal] = useState(0)

  // Mirror the latest values into refs so the stable callbacks/effects below
  // (and App's empty-deps global keydown handler) always read current state.
  const sessionRef = useRef(session)
  sessionRef.current = session
  const prefsRef = useRef(args.prefs)
  prefsRef.current = args.prefs
  const onCompleteRef = useRef(args.onComplete)
  onCompleteRef.current = args.onComplete
  // The endsAt we've already fired completion for — guards against double-firing
  // when a burst of ticks (or a focus recompute) all observe the same deadline.
  const completedFor = useRef<number | null>(null)

  const apply = useCallback((next: PomodoroSession | null) => {
    sessionRef.current = next
    setSession(next)
    saveSession(next)
  }, [])

  const handleComplete = useCallback(
    (finished: PomodoroSession) => {
      onCompleteRef.current(finished)
      setCompletionSignal((n) => n + 1)
      const prefs = prefsRef.current
      const { phase, completedWork } = nextPhase(finished, prefs)
      const autoStart = phase === 'work' ? prefs.autoStartWork : prefs.autoStartBreaks
      const dur = phaseDurationMs(prefs, phase)
      const t = Date.now()
      apply({
        phase,
        endsAt: t + dur,
        durationMs: dur,
        running: autoStart,
        pausedRemainingMs: autoStart ? undefined : dur,
        taskId: null,
        taskText: null,
        completedWork,
        date: todayStr(),
      })
    },
    [apply],
  )

  // One function drives both the interval and the visibility/focus recompute:
  // refresh `now`, and complete the phase exactly once if the deadline passed.
  const tick = useCallback(() => {
    const cur = sessionRef.current
    const t = Date.now()
    setNow(t)
    if (cur && cur.running && t >= cur.endsAt && completedFor.current !== cur.endsAt) {
      completedFor.current = cur.endsAt
      handleComplete(cur)
    }
  }, [handleComplete])

  // Restore on mount: if a running session's deadline already passed (the tab was
  // closed through it), show it as finished WITHOUT auto-logging — we can't know
  // the user actually focused, and a false record is worse than a missed one.
  // This must run BEFORE the ticker so its immediate tick() (which reads the now
  // synchronously-updated sessionRef) doesn't fire a false completion + log.
  useEffect(() => {
    const cur = sessionRef.current
    if (cur && cur.running && Date.now() >= cur.endsAt) {
      completedFor.current = cur.endsAt
      apply({ ...cur, running: false, pausedRemainingMs: 0 })
    }
  }, [apply])

  // Display ticker — runs only while a session is actively running.
  useEffect(() => {
    if (!session?.running) return
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [session?.running, tick])

  // Recompute the instant the tab is foregrounded, so a phase that elapsed while
  // backgrounded resolves immediately rather than waiting for a throttled tick.
  useEffect(() => {
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [tick])

  const begin = useCallback(
    (phase: PomoPhase, taskId: string | null, taskText: string | null, completedWork: number) => {
      const dur = phaseDurationMs(prefsRef.current, phase)
      const t = Date.now()
      if (prefsRef.current.sound) playSound('start')
      apply({
        phase,
        endsAt: t + dur,
        durationMs: dur,
        running: true,
        taskId,
        taskText,
        completedWork,
        date: todayStr(),
      })
    },
    [apply],
  )

  const start = useCallback(
    (opts: StartOpts = {}) => {
      const cur = sessionRef.current
      if (cur && cur.running && cur.phase === 'work') return // commitment: no restart mid-work
      begin('work', opts.taskId ?? null, opts.taskText ?? null, cur?.completedWork ?? 0)
    },
    [begin],
  )

  const pause = useCallback(() => {
    const cur = sessionRef.current
    if (!cur || !cur.running) return
    apply({ ...cur, running: false, pausedRemainingMs: Math.max(0, cur.endsAt - Date.now()) })
  }, [apply])

  const resume = useCallback(() => {
    const cur = sessionRef.current
    if (!cur || cur.running) return
    const rem = cur.pausedRemainingMs ?? 0
    if (rem <= 0) return
    apply({ ...cur, running: true, endsAt: Date.now() + rem, pausedRemainingMs: undefined })
  }, [apply])

  // Continue from a finished/ready state into the next phase, running now.
  const advance = useCallback(() => {
    const cur = sessionRef.current
    if (!cur) return
    const phase: PomoPhase = cur.phase === 'work' ? 'shortBreak' : 'work'
    begin(phase, null, null, cur.completedWork)
  }, [begin])

  const toggle = useCallback(() => {
    const cur = sessionRef.current
    if (!cur) return // idle: P doesn't start — that's F / the Focus button
    if (cur.running) {
      pause()
      return
    }
    if ((cur.pausedRemainingMs ?? 0) <= 0) {
      advance() // done → continue to the next phase, don't discard it
      return
    }
    resume()
  }, [advance, pause, resume])

  const skip = useCallback(() => {
    const cur = sessionRef.current
    if (!cur) return
    const phase: PomoPhase = cur.phase === 'work' ? 'shortBreak' : 'work'
    const dur = phaseDurationMs(prefsRef.current, phase)
    apply({
      phase,
      endsAt: Date.now() + dur,
      durationMs: dur,
      running: false,
      pausedRemainingMs: dur,
      taskId: null,
      taskText: null,
      completedWork: cur.completedWork,
      date: todayStr(),
    })
  }, [apply])

  const reset = useCallback(() => {
    if (!sessionRef.current) return // no-op when idle (so a stray R does nothing)
    completedFor.current = null
    clearSession()
    sessionRef.current = null
    setSession(null)
  }, [])

  // Cross-tab sync: adopt the session another tab writes, so pause/resume/start/
  // reset propagate and the tabs behave as one logical timer.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SESSION_KEY) return
      const next = loadSession()
      sessionRef.current = next
      setSession(next)
      // Don't re-fire completion for a phase another tab already resolved.
      completedFor.current = next && next.running ? null : (next?.endsAt ?? null)
      setNow(Date.now())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const remaining = session ? remainingMsOf(session, now) : 0
  const isDone = !!session && !session.running && remaining === 0

  return {
    session,
    remainingMs: remaining,
    isDone,
    completionSignal,
    start,
    pause,
    resume,
    toggle,
    skip,
    advance,
    reset,
  }
}
