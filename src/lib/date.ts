export function todayStr(): string {
  return formatDate(new Date())
}

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

export function nowTime(): string {
  const d = new Date()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function displayDate(date: string): string {
  const t = todayStr()
  if (date === t) return 'Today'
  if (date === addDays(t, -1)) return 'Yesterday'
  if (date === addDays(t, 1)) return 'Tomorrow'
  const d = parseDate(date)
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** Validate and normalize a user-entered time string like "9:5" → "09:05". Returns null if invalid. */
export function normalizeTime(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const m = /^(\d{1,2}):(\d{1,2})$/.exec(trimmed)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
