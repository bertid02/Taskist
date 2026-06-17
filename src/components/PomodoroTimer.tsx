import { useEffect, useRef, useState } from 'react'
import type { PomodoroPrefs, PomodoroSession } from '../types'
import { formatRemaining } from '../lib/pomodoro'
import { PauseIcon, PlayIcon, SkipIcon, XIcon } from './icons'
import { iconButtonClass } from './ui'

type Props = {
  session: PomodoroSession | null
  remainingMs: number
  isDone: boolean
  completionSignal: number
  prefs: PomodoroPrefs
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onSkip: () => void
  onAdvance: () => void
  onReset: () => void
  onChangePrefs: (patch: Partial<PomodoroPrefs>) => void
}

// Consistent shell across every state, so the bar has one findable home and the
// layout never jumps when a session starts/stops.
const shell =
  'relative flex items-center gap-3 rounded-md px-3 py-2 min-h-10 overflow-hidden transition-colors duration-500'

export function PomodoroTimer({
  session,
  remainingMs,
  isDone,
  completionSignal,
  prefs,
  onStart,
  onPause,
  onResume,
  onSkip,
  onAdvance,
  onReset,
  onChangePrefs,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Brief brighter fill on completion that fades back via transition-colors.
  const [flashing, setFlashing] = useState(false)
  const prevSignal = useRef(completionSignal)
  useEffect(() => {
    if (completionSignal === prevSignal.current) return
    prevSignal.current = completionSignal
    setFlashing(true)
    const id = window.setTimeout(() => setFlashing(false), 650)
    return () => window.clearTimeout(id)
  }, [completionSignal])

  const running = session?.running ?? false
  const isWork = session?.phase === 'work'
  const isBreak = !!session && !isWork
  const phaseLabel = !session
    ? 'Focus'
    : isWork
      ? session.taskText || 'Focus'
      : session.phase === 'longBreak'
        ? 'Long break'
        : 'Short break'
  const ready = !!session && !running && !isDone && (session.pausedRemainingMs ?? 0) >= session.durationMs
  const status = isDone ? 'Done' : !session ? null : running ? null : ready ? 'Ready' : 'Paused'
  const progress = session && session.durationMs > 0 ? 1 - remainingMs / session.durationMs : 0
  const doneNextLabel = session?.phase === 'work' ? 'Start break' : 'Start focus'

  const border = !session
    ? 'border border-neutral-200 dark:border-neutral-800'
    : isBreak
      ? 'border border-dashed border-neutral-300 dark:border-neutral-700'
      : 'border border-transparent'
  const stateBg = !session
    ? ''
    : isDone
      ? 'bg-neutral-200 dark:bg-neutral-800'
      : isBreak
        ? 'bg-neutral-50 dark:bg-neutral-900/40'
        : 'bg-neutral-100 dark:bg-neutral-900'
  const bg = flashing ? 'bg-neutral-300 dark:bg-neutral-700' : stateBg

  const liveText = !session
    ? ''
    : isDone
      ? `${phaseLabel} complete`
      : running
        ? `${phaseLabel} running`
        : ready
          ? `${phaseLabel} ready`
          : `${phaseLabel} paused`

  return (
    <div className="relative">
      <span aria-live="polite" className="sr-only">
        {liveText}
      </span>

      <div className={`${shell} ${border} ${bg}`}>
        {!session ? (
          <>
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-1.5 text-[13px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="Start a focus session (F)"
            >
              <PlayIcon />
              Focus
            </button>
            <span className="flex-1" />
            <SettingsToggle prefs={prefs} open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
          </>
        ) : (
          <>
            <span
              className={`text-[20px] font-semibold tabular-nums tracking-tight shrink-0 ${
                running ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {formatRemaining(remainingMs)}
            </span>
            <span className="flex-1 min-w-0 truncate text-[14px] leading-tight text-neutral-600 dark:text-neutral-300">
              {phaseLabel}
              {status && <span className="ml-2 text-neutral-400 dark:text-neutral-500">· {status}</span>}
            </span>

            <CycleDots prefs={prefs} session={session} isDone={isDone} />

            <div className="flex items-center gap-0.5 shrink-0">
              {isDone ? (
                <button
                  type="button"
                  onClick={onAdvance}
                  title={`${doneNextLabel} (P)`}
                  className="h-6 px-2 rounded text-[11px] font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-80 transition-opacity focus-visible:ring-1 focus-visible:ring-neutral-400"
                >
                  {doneNextLabel}
                </button>
              ) : running ? (
                <IconButton label="Pause (P)" onClick={onPause}>
                  <PauseIcon />
                </IconButton>
              ) : (
                <IconButton label="Start (P)" onClick={onResume}>
                  <PlayIcon />
                </IconButton>
              )}
              {!isDone && (
                <IconButton label="Skip (S)" onClick={onSkip}>
                  <SkipIcon />
                </IconButton>
              )}
              {!running && (
                <IconButton label="Cancel (R)" onClick={onReset}>
                  <XIcon />
                </IconButton>
              )}
              <SettingsToggle prefs={prefs} open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
            </div>

            {!isDone && (
              <div
                role="progressbar"
                aria-label="time remaining"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(100, Math.max(0, progress * 100)))}
                className={`absolute bottom-0 left-0 h-0.5 ${
                  running
                    ? 'bg-neutral-400 dark:bg-neutral-500 transition-[width] duration-300 ease-linear'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            )}
          </>
        )}
      </div>

      <div
        className={`grid transition-all duration-200 ease-out overflow-hidden ${
          settingsOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        <div className="min-h-0">
          <Settings prefs={prefs} onChange={onChangePrefs} />
        </div>
      </div>
    </div>
  )
}

function CycleDots({
  prefs,
  session,
  isDone,
}: {
  prefs: PomodoroPrefs
  session: PomodoroSession
  isDone: boolean
}) {
  if (isDone || prefs.longBreakEvery <= 1) return null
  const filled =
    session.phase === 'longBreak'
      ? prefs.longBreakEvery
      : session.completedWork % prefs.longBreakEvery
  return (
    <div
      className="hidden sm:flex items-center gap-1 shrink-0"
      title={`${filled} of ${prefs.longBreakEvery} focus blocks until a long break`}
      aria-hidden
    >
      {Array.from({ length: prefs.longBreakEvery }).map((_, i) => (
        <span
          key={i}
          className={`w-1 h-1 rounded-full ${
            i < filled ? 'bg-neutral-400 dark:bg-neutral-500' : 'bg-neutral-300/70 dark:bg-neutral-700'
          }`}
        />
      ))}
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={iconButtonClass}>
      {children}
    </button>
  )
}

function SettingsToggle({
  prefs,
  open,
  onToggle,
}: {
  prefs: PomodoroPrefs
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title="Timer settings"
      className="shrink-0 text-[11px] tabular-nums tracking-wide text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700 rounded px-1"
    >
      {prefs.workMin} · {prefs.shortBreakMin}
    </button>
  )
}

function Settings({
  prefs,
  onChange,
}: {
  prefs: PomodoroPrefs
  onChange: (patch: Partial<PomodoroPrefs>) => void
}) {
  const requestNotify = () => {
    if (prefs.notify) {
      onChange({ notify: false })
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    onChange({ notify: true })
  }
  return (
    <div className="rounded-md border border-neutral-100 dark:border-neutral-900 px-3 py-3">
      <GroupLabel>Durations (min)</GroupLabel>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-5">
        <NumField label="Focus" value={prefs.workMin} min={1} max={180} onCommit={(v) => onChange({ workMin: v })} />
        <NumField label="Break" value={prefs.shortBreakMin} min={1} max={60} onCommit={(v) => onChange({ shortBreakMin: v })} />
        <NumField label="Long break" value={prefs.longBreakMin} min={1} max={60} onCommit={(v) => onChange({ longBreakMin: v })} />
        <NumField label="Long after" value={prefs.longBreakEvery} min={1} max={12} onCommit={(v) => onChange({ longBreakEvery: v })} />
      </div>
      <GroupLabel className="mt-4">Behaviour</GroupLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle label="auto-start breaks" active={prefs.autoStartBreaks} onClick={() => onChange({ autoStartBreaks: !prefs.autoStartBreaks })} />
        <Toggle label="auto-start focus" active={prefs.autoStartWork} onClick={() => onChange({ autoStartWork: !prefs.autoStartWork })} />
        <Toggle label="log sessions" active={prefs.autoLogSessions} onClick={() => onChange({ autoLogSessions: !prefs.autoLogSessions })} />
        <Toggle label="sound" active={prefs.sound} onClick={() => onChange({ sound: !prefs.sound })} />
        <Toggle label="notify" active={prefs.notify} onClick={requestNotify} />
      </div>
    </div>
  )
}

function GroupLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`text-[10px] uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-1.5 ${className}`}
    >
      {children}
    </div>
  )
}

function NumField({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  onCommit: (v: number) => void
}) {
  // Local draft so typing isn't clamped mid-keystroke; commit on blur / Enter.
  const [draft, setDraft] = useState(String(value))
  useEffect(() => {
    setDraft(String(value))
  }, [value])
  const commit = () => {
    const n = parseInt(draft, 10)
    const next = Number.isNaN(n) ? value : Math.min(max, Math.max(min, n))
    onCommit(next)
    setDraft(String(next))
  }
  return (
    <label className="inline-flex items-center gap-1.5 text-[13px] text-neutral-600 dark:text-neutral-400">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-12 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 px-1.5 py-1 text-[13px] tabular-nums text-center outline-none focus:border-neutral-300 dark:focus:border-neutral-700 focus:ring-1 focus:ring-neutral-200 dark:focus:ring-neutral-700"
      />
    </label>
  )
}

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-[11px] tracking-wide px-2 py-0.5 rounded-full transition-colors focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700 ${
        active
          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
          : 'border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
      }`}
    >
      {label}
    </button>
  )
}
