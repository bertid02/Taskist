import { useState } from 'react'
import type { PomodoroPrefs, PomodoroSession } from '../types'
import { formatRemaining } from '../lib/pomodoro'
import { PauseIcon, PlayIcon, SkipIcon, XIcon } from './icons'

type Props = {
  session: PomodoroSession | null
  remainingMs: number
  isDone: boolean
  prefs: PomodoroPrefs
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onSkip: () => void
  onReset: () => void
  onChangePrefs: (patch: Partial<PomodoroPrefs>) => void
}

export function PomodoroTimer({
  session,
  remainingMs,
  isDone,
  prefs,
  onStart,
  onPause,
  onResume,
  onSkip,
  onReset,
  onChangePrefs,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)

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
  const ready = !!session && !running && !isDone && remainingMs >= session.durationMs - 50
  const status = isDone ? 'Done' : !session ? null : running ? null : ready ? 'Ready' : 'Paused'
  const progress = session && session.durationMs > 0 ? 1 - remainingMs / session.durationMs : 0

  // Container treatment encodes state without colour: filled for work/done,
  // dashed-outline for breaks, dimmed for paused (mirrors the app's idioms).
  const strip = isDone
    ? 'bg-neutral-200 dark:bg-neutral-800'
    : isBreak
      ? 'border border-dashed border-neutral-200 dark:border-neutral-800'
      : 'bg-neutral-100 dark:bg-neutral-900'

  return (
    <div className="relative">
      {!session ? (
        <div className="group relative flex items-center justify-center py-1">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-1.5 text-[11px] tracking-wide text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            title="Start a focus session (F)"
          >
            <PlayIcon />
            Focus
          </button>
          <SettingsToggle
            prefs={prefs}
            open={settingsOpen}
            onToggle={() => setSettingsOpen((v) => !v)}
            className="absolute right-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          />
        </div>
      ) : (
        <div className={`relative flex items-center gap-3 rounded-md px-3 py-2 overflow-hidden ${strip}`}>
          <span
            className={`text-[20px] font-semibold tabular-nums tracking-tight shrink-0 ${
              running ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            {formatRemaining(remainingMs)}
          </span>
          <span className="flex-1 min-w-0 truncate text-[13px] text-neutral-500 dark:text-neutral-400">
            {phaseLabel}
            {status && <span className="ml-2 text-neutral-400 dark:text-neutral-600">· {status}</span>}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            {running ? (
              <IconButton label="Pause (P)" onClick={onPause}>
                <PauseIcon />
              </IconButton>
            ) : !isDone ? (
              <IconButton label="Start (P)" onClick={onResume}>
                <PlayIcon />
              </IconButton>
            ) : null}
            <IconButton label="Skip (S)" onClick={onSkip}>
              <SkipIcon />
            </IconButton>
            {!running && (
              <IconButton label="Cancel (R)" onClick={onReset}>
                <XIcon />
              </IconButton>
            )}
            <SettingsToggle prefs={prefs} open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
          </div>
          {running && (
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-neutral-300 dark:bg-neutral-700 transition-[width] duration-300 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          )}
        </div>
      )}

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
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid place-items-center w-6 h-6 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-500 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
    >
      {children}
    </button>
  )
}

function SettingsToggle({
  prefs,
  open,
  onToggle,
  className = '',
}: {
  prefs: PomodoroPrefs
  open: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title="Timer settings"
      className={`text-[11px] tabular-nums tracking-wide text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors ${className}`}
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
  const clamp = (v: string, min: number, max: number, fallback: number) => {
    const n = parseInt(v, 10)
    if (Number.isNaN(n)) return fallback
    return Math.min(max, Math.max(min, n))
  }
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
    <div className="rounded-md border border-neutral-100 dark:border-neutral-900 px-3 py-3 text-[13px] text-neutral-600 dark:text-neutral-400">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <NumField label="Focus" value={prefs.workMin} onChange={(v) => onChange({ workMin: clamp(v, 1, 180, prefs.workMin) })} />
        <NumField label="Break" value={prefs.shortBreakMin} onChange={(v) => onChange({ shortBreakMin: clamp(v, 1, 60, prefs.shortBreakMin) })} />
        <NumField label="Long break" value={prefs.longBreakMin} onChange={(v) => onChange({ longBreakMin: clamp(v, 1, 60, prefs.longBreakMin) })} />
        <NumField label="Long every" value={prefs.longBreakEvery} onChange={(v) => onChange({ longBreakEvery: clamp(v, 1, 12, prefs.longBreakEvery) })} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Toggle label="auto-start breaks" active={prefs.autoStartBreaks} onClick={() => onChange({ autoStartBreaks: !prefs.autoStartBreaks })} />
        <Toggle label="auto-start focus" active={prefs.autoStartWork} onClick={() => onChange({ autoStartWork: !prefs.autoStartWork })} />
        <Toggle label="log sessions" active={prefs.autoLogSessions} onClick={() => onChange({ autoLogSessions: !prefs.autoLogSessions })} />
        <Toggle label="sound" active={prefs.sound} onClick={() => onChange({ sound: !prefs.sound })} />
        <Toggle label="notify" active={prefs.notify} onClick={requestNotify} />
      </div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: string) => void
}) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 px-1.5 py-1 text-[13px] tabular-nums text-center outline-none focus:border-neutral-300 dark:focus:border-neutral-700 focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700"
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
      className={`text-[11px] tracking-wide transition-colors ${
        active
          ? 'text-neutral-700 dark:text-neutral-300'
          : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
      }`}
    >
      {label}
    </button>
  )
}
