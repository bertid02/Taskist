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

export type Prefs = {
  /** When true, new log entries are added without a timestamp by default. */
  noTimeDefault: boolean
  /** When true, ticking a priority auto-appends a matching log entry. */
  autoLog: boolean
  theme: Theme
}

export type Store = {
  version: 1
  days: Record<string, Day>
  prefs: Prefs
}

export const emptyStore = (): Store => ({
  version: 1,
  days: {},
  prefs: { noTimeDefault: false, autoLog: true, theme: 'system' },
})
