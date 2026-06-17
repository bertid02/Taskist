import { DEFAULT_POMODORO, emptyStore, type Day, type Store } from './types'

export const KEY = 'taskist.v1'

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Partial<Store>
    if (!parsed || parsed.version !== 1 || typeof parsed.days !== 'object') {
      return emptyStore()
    }
    return {
      version: 1,
      days: normalizeDays(parsed.days ?? {}),
      prefs: {
        noTimeDefault: false,
        autoLog: true,
        theme: 'system',
        ...(parsed.prefs ?? {}),
        // Deep-merge the nested object so adding a sub-field later still gets a default.
        pomodoro: { ...DEFAULT_POMODORO, ...(parsed.prefs?.pomodoro ?? {}) },
      },
    }
  } catch {
    return emptyStore()
  }
}

/**
 * Bring stored days up to the current shape. Priorities saved before the
 * two-tier feature have no `tier`; treat them as `today` (they were the single
 * committed list), independent of the new-task default. Idempotent, so it's
 * safe to run on every load without bumping the store version.
 */
function normalizeDays(days: Record<string, Day>): Record<string, Day> {
  const out: Record<string, Day> = {}
  for (const [date, day] of Object.entries(days ?? {})) {
    out[date] = {
      ...day,
      priorities: (day.priorities ?? []).map((p) => ({
        ...p,
        tier: p.tier === 'later' ? 'later' : 'today',
      })),
      log: day.log ?? [],
    }
  }
  return out
}

export function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // ignore quota errors; nothing to surface to the user yet
  }
}
