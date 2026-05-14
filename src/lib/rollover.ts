import type { Day, Store } from '../types'
import { uid } from './uid'

/**
 * Ensure a Day exists in the store for the given date. If absent, create it,
 * carrying over any unfinished priorities from the most recent prior day.
 *
 * Rollovers are copies — the historical record on the prior day is preserved.
 * The `rolledOverFrom` field chains back to the earliest source day, so a
 * priority unfinished across multiple days still points at its origin.
 */
export function ensureDay(store: Store, date: string): { store: Store; created: boolean } {
  if (store.days[date]) return { store, created: false }

  const priorDate = mostRecentPriorDate(store, date)
  const prior = priorDate ? store.days[priorDate] : undefined
  const rollovers: Day['priorities'] = (prior?.priorities ?? [])
    .filter((p) => !p.done)
    .map((p) => ({
      id: uid(),
      text: p.text,
      done: false,
      createdAt: Date.now(),
      rolledOverFrom: p.rolledOverFrom ?? prior!.date,
    }))

  const newDay: Day = {
    date,
    priorities: rollovers,
    log: [],
  }

  return {
    store: { ...store, days: { ...store.days, [date]: newDay } },
    created: true,
  }
}

function mostRecentPriorDate(store: Store, date: string): string | null {
  let best: string | null = null
  for (const d of Object.keys(store.days)) {
    if (d < date && (best === null || d > best)) best = d
  }
  return best
}
