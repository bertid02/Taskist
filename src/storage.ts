import { emptyStore, type Store } from './types'

const KEY = 'taskist.v1'

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
      days: parsed.days ?? {},
      prefs: { noTimeDefault: false, autoLog: true, theme: 'system', ...(parsed.prefs ?? {}) },
    }
  } catch {
    return emptyStore()
  }
}

export function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // ignore quota errors; nothing to surface to the user yet
  }
}
