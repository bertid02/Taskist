/**
 * Which tier a priority lives in. `today` is a committed must-do for the day;
 * `later` is the no-pressure backlog (displayed as "Anytime"). Both tiers roll
 * over when unfinished — the tier only changes how a task reads and where it sits.
 */
export type Tier = 'today' | 'later'

/** Tier a brand-new priority lands in when no explicit tier is given. */
export const DEFAULT_TIER: Tier = 'today'

export type Priority = {
  id: string
  text: string
  done: boolean
  createdAt: number
  tier: Tier
  /** ISO date (YYYY-MM-DD) of the original day this priority first appeared on. */
  rolledOverFrom?: string
}

export type LogEntry = {
  id: string
  text: string
  /** HH:MM, or null if the user opted out of a timestamp for this entry. */
  time: string | null
  createdAt: number
  /** Set when this entry was auto-created by ticking a priority; links back to that priority's id. */
  priorityId?: string
}

export type Day = {
  date: string
  priorities: Priority[]
  log: LogEntry[]
}

export type Theme = 'light' | 'dark' | 'system'

/** Which kind of block a pomodoro session is currently in. */
export type PomoPhase = 'work' | 'shortBreak' | 'longBreak'

/** User-tunable pomodoro settings. Durations are in minutes (human-editable). */
export type PomodoroPrefs = {
  workMin: number
  shortBreakMin: number
  longBreakMin: number
  /** A long break replaces the short break after this many completed work blocks. */
  longBreakEvery: number
  /** When true, the break starts counting down immediately after a work block. */
  autoStartBreaks: boolean
  /** When true, the next work block starts immediately after a break. */
  autoStartWork: boolean
  /** Play a short chime on phase completion. */
  sound: boolean
  /** Show a system notification on phase completion (permission requested on enable). */
  notify: boolean
  /** Auto-append a Did entry when a work block completes. */
  autoLogSessions: boolean
}

export const DEFAULT_POMODORO: PomodoroPrefs = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  sound: true,
  notify: false,
  autoLogSessions: true,
}

export type Prefs = {
  /** When true, new log entries are added without a timestamp by default. */
  noTimeDefault: boolean
  /** When true, ticking a priority auto-appends a matching log entry. */
  autoLog: boolean
  theme: Theme
  pomodoro: PomodoroPrefs
}

/**
 * A live pomodoro session. Persisted to its OWN localStorage key, deliberately
 * outside the undo'd Store, so per-second ticks never touch undo/persistence.
 * Absent === idle.
 */
export type PomodoroSession = {
  phase: PomoPhase
  /** Absolute epoch ms when the current phase ends — the source of truth for remaining time. */
  endsAt: number
  /** Full length of the current phase in ms (for the progress bar + resume math). */
  durationMs: number
  running: boolean
  /** Set only while paused; on resume, endsAt is recomputed from this. */
  pausedRemainingMs?: number
  /** Bound priority id, or null for an untethered focus block. */
  taskId: string | null
  /** Snapshot of the task text so a deleted task can still display/log. */
  taskText: string | null
  /** Count of completed work blocks in the current cycle (drives long-break cadence). */
  completedWork: number
  /** YYYY-MM-DD the session belongs to — where a completion entry is logged. */
  date: string
}

export type Store = {
  version: 1
  days: Record<string, Day>
  prefs: Prefs
}

export const emptyStore = (): Store => ({
  version: 1,
  days: {},
  prefs: { noTimeDefault: false, autoLog: true, theme: 'system', pomodoro: DEFAULT_POMODORO },
})
