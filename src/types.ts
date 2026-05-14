export type Priority = {
  id: string
  text: string
  done: boolean
  createdAt: number
  /** ISO date (YYYY-MM-DD) of the original day this priority first appeared on. */
  rolledOverFrom?: string
}

export type LogEntry = {
  id: string
  text: string
  /** HH:MM, or null if the user opted out of a timestamp for this entry. */
  time: string | null
  createdAt: number
}

export type Day = {
  date: string
  priorities: Priority[]
  log: LogEntry[]
}

export type Prefs = {
  /** When true, new log entries are added without a timestamp by default. */
  noTimeDefault: boolean
}

export type Store = {
  version: 1
  days: Record<string, Day>
  prefs: Prefs
}

export const emptyStore = (): Store => ({
  version: 1,
  days: {},
  prefs: { noTimeDefault: false },
})
