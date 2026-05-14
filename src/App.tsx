import { useCallback, useEffect, useRef, useState } from 'react'
import type { Day, LogEntry, Priority, Store, Theme } from './types'
import { load, save } from './storage'
import { ensureDay } from './lib/rollover'
import { addDays, todayStr } from './lib/date'
import { uid } from './lib/uid'
import { DateHeader } from './components/DateHeader'
import { PriorityColumn } from './components/PriorityColumn'
import { LogColumn } from './components/LogColumn'
import { ThemeToggle } from './components/ThemeToggle'
import { KeyboardHints } from './components/KeyboardHints'

const UNDO_LIMIT = 50

export default function App() {
  const [store, setStore] = useState<Store>(() => {
    const initial = load()
    const { store: withToday } = ensureDay(initial, todayStr())
    return withToday
  })
  const [date, setDate] = useState<string>(todayStr())
  const undoStack = useRef<Store[]>([])
  const priorityInputRef = useRef<HTMLInputElement>(null)
  const logInputRef = useRef<HTMLInputElement>(null)

  // Persist on every change.
  useEffect(() => {
    save(store)
  }, [store])

  // Focus the priority input on mount and whenever the viewed date changes.
  useEffect(() => {
    priorityInputRef.current?.focus()
  }, [date])

  // Roll the day forward when the window regains focus (handles overnight sessions).
  useEffect(() => {
    function onFocus() {
      const t = todayStr()
      setStore((s) => {
        const { store: next, created } = ensureDay(s, t)
        return created ? next : s
      })
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Periodic check for date change while the app is open.
  useEffect(() => {
    const id = window.setInterval(() => {
      const t = todayStr()
      setStore((s) => {
        const { store: next, created } = ensureDay(s, t)
        return created ? next : s
      })
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Apply theme to <html>.
  useEffect(() => {
    const theme = store.prefs.theme
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
    }
    apply()
    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [store.prefs.theme])

  const day: Day = store.days[date] ?? { date, priorities: [], log: [] }

  const mutate = useCallback((updater: (s: Store) => Store) => {
    setStore((prev) => {
      undoStack.current.push(structuredClone(prev))
      if (undoStack.current.length > UNDO_LIMIT) undoStack.current.shift()
      return updater(prev)
    })
  }, [])

  const updateDay = useCallback(
    (updater: (d: Day) => Day) => {
      mutate((s) => {
        const current = s.days[date] ?? { date, priorities: [], log: [] }
        return { ...s, days: { ...s.days, [date]: updater(current) } }
      })
    },
    [date, mutate],
  )

  // Global shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = isTyping(e.target)

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const prev = undoStack.current.pop()
        if (prev) {
          setStore(prev)
          e.preventDefault()
        }
        return
      }
      if (typing) return
      if (e.key === '[') {
        e.preventDefault()
        setDate((d) => addDays(d, -1))
      } else if (e.key === ']') {
        e.preventDefault()
        setDate((d) => addDays(d, 1))
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        setDate(todayStr())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Priority handlers
  const addPriority = (text: string) => {
    updateDay((d) => ({
      ...d,
      priorities: [
        ...d.priorities,
        { id: uid(), text, done: false, createdAt: Date.now() } satisfies Priority,
      ],
    }))
  }
  const togglePriority = (id: string) =>
    updateDay((d) => ({
      ...d,
      priorities: d.priorities.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
    }))
  const editPriority = (id: string, text: string) =>
    updateDay((d) => ({
      ...d,
      priorities: d.priorities.map((p) => (p.id === id ? { ...p, text } : p)),
    }))
  const deletePriority = (id: string) =>
    updateDay((d) => ({ ...d, priorities: d.priorities.filter((p) => p.id !== id) }))
  const reorderPriority = (id: string, dir: -1 | 1) =>
    updateDay((d) => ({ ...d, priorities: move(d.priorities, id, dir) }))

  // Log handlers
  const addLog = (text: string, time: string | null) => {
    updateDay((d) => ({
      ...d,
      log: [...d.log, { id: uid(), text, time, createdAt: Date.now() } satisfies LogEntry],
    }))
  }
  const editLogText = (id: string, text: string) =>
    updateDay((d) => ({
      ...d,
      log: d.log.map((e) => (e.id === id ? { ...e, text } : e)),
    }))
  const editLogTime = (id: string, time: string | null) =>
    updateDay((d) => ({
      ...d,
      log: d.log.map((e) => (e.id === id ? { ...e, time } : e)),
    }))
  const deleteLog = (id: string) =>
    updateDay((d) => ({ ...d, log: d.log.filter((e) => e.id !== id) }))
  const reorderLog = (id: string, dir: -1 | 1) =>
    updateDay((d) => ({ ...d, log: move(d.log, id, dir) }))

  const toggleNoTimeDefault = () =>
    mutate((s) => ({ ...s, prefs: { ...s.prefs, noTimeDefault: !s.prefs.noTimeDefault } }))

  const setTheme = (theme: Theme) =>
    setStore((s) => ({ ...s, prefs: { ...s.prefs, theme } }))

  return (
    <div className="min-h-dvh bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 sm:px-10 py-8">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-neutral-300 dark:text-neutral-700 select-none">
            Taskist
          </span>
          <ThemeToggle theme={store.prefs.theme} onChange={setTheme} />
        </div>

        <div className="mt-12">
          <DateHeader
            date={date}
            onPrev={() => setDate(addDays(date, -1))}
            onNext={() => setDate(addDays(date, 1))}
            onToday={() => setDate(todayStr())}
          />
        </div>

        <main className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-10">
          <PriorityColumn
            ref={priorityInputRef}
            priorities={day.priorities}
            onAdd={addPriority}
            onToggle={togglePriority}
            onEdit={editPriority}
            onDelete={deletePriority}
            onReorder={reorderPriority}
          />
          <LogColumn
            ref={logInputRef}
            entries={day.log}
            noTimeDefault={store.prefs.noTimeDefault}
            onToggleNoTimeDefault={toggleNoTimeDefault}
            onAdd={addLog}
            onEditText={editLogText}
            onEditTime={editLogTime}
            onDelete={deleteLog}
            onReorder={reorderLog}
          />
        </main>

        <KeyboardHints />
      </div>
    </div>
  )
}

function move<T extends { id: string }>(arr: T[], id: string, dir: -1 | 1): T[] {
  const idx = arr.findIndex((x) => x.id === id)
  if (idx === -1) return arr
  const next = idx + dir
  if (next < 0 || next >= arr.length) return arr
  const copy = arr.slice()
  ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
  return copy
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

