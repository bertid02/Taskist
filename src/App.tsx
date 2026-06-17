import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_TIER,
  type Day,
  type LogEntry,
  type PomodoroPrefs,
  type PomodoroSession,
  type Priority,
  type Store,
  type Theme,
  type Tier,
} from './types'
import { KEY, load, save } from './storage'
import { ensureDay } from './lib/rollover'
import { addDays, nowTime, todayStr } from './lib/date'
import { uid } from './lib/uid'
import { formatDayLog } from './lib/clipboard'
import { formatRemaining } from './lib/pomodoro'
import { usePomodoro } from './lib/usePomodoro'
import { playSound, unlockAudio } from './lib/chime'
import { DateHeader } from './components/DateHeader'
import { PriorityColumn } from './components/PriorityColumn'
import { LogColumn } from './components/LogColumn'
import { PomodoroTimer } from './components/PomodoroTimer'
import { ThemeToggle } from './components/ThemeToggle'
import { KeyboardHints } from './components/KeyboardHints'
import { Logo } from './components/Logo'

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
  // Set when a store change came from another tab (via storage event), so we
  // don't echo it straight back to localStorage and ping-pong.
  const skipSave = useRef(false)

  // Persist on every change.
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    save(store)
  }, [store])

  // Cross-tab sync: adopt another tab's store writes (so a focus session logged
  // in one tab shows in the other, and completions don't silently diverge).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return
      skipSave.current = true
      setStore(load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
  const dayRef = useRef(day)
  useEffect(() => {
    dayRef.current = day
  }, [day])
  // Latest store, read synchronously by pomodoro completion (which may fire for a
  // day other than the one being viewed).
  const storeRef = useRef(store)
  storeRef.current = store

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

  // Pomodoro. Completion side-effects route through the undoable log path and
  // target the session's OWN day (which may differ from the viewed `date` after
  // midnight or date navigation); the timer's ticking lives entirely in the hook,
  // outside the Store and undo stack.
  const onPomodoroComplete = useCallback(
    (s: PomodoroSession) => {
      const prefs = storeRef.current.prefs
      if (s.phase === 'work' && prefs.pomodoro.autoLogSessions) {
        const minutes = Math.round(s.durationMs / 60_000)
        const text = s.taskText ?? `Focus — ${minutes}m`
        const existing = storeRef.current.days[s.date]
        // Dedupe against the tick auto-log (same priorityId) and against a
        // near-simultaneous duplicate (same text just logged) — the latter guards
        // StrictMode re-fires and a second tab completing the same block.
        const alreadyLogged = !!existing?.log.some(
          (e) =>
            (s.taskId && e.priorityId === s.taskId) ||
            (e.text === text && Date.now() - e.createdAt < 5_000),
        )
        if (!alreadyLogged) {
          mutate((store0) => {
            const { store: withDay } = ensureDay(store0, s.date)
            const target = withDay.days[s.date]
            const entry: LogEntry = {
              id: uid(),
              text,
              time: store0.prefs.noTimeDefault ? null : nowTime(),
              createdAt: Date.now(),
              priorityId: s.taskId ?? undefined,
            }
            return {
              ...withDay,
              days: { ...withDay.days, [s.date]: { ...target, log: [...target.log, entry] } },
            }
          })
        }
      }
      // Avoid double-signalling: when the tab is hidden and notifications are
      // granted, let the OS notification (with its own sound) be the signal;
      // otherwise play the in-app chime.
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      const canNotify =
        prefs.pomodoro.notify &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      if (hidden && canNotify) {
        try {
          new Notification('Taskist', {
            body: s.phase === 'work' ? s.taskText || 'Focus complete' : 'Break over',
          })
        } catch {
          // ignore notification failures
        }
      } else if (prefs.pomodoro.sound) {
        playSound(
          s.phase === 'work'
            ? 'focusComplete'
            : s.phase === 'longBreak'
              ? 'breakOverLong'
              : 'breakOver',
        )
      }
    },
    [mutate],
  )

  const pomo = usePomodoro({ prefs: store.prefs.pomodoro, onComplete: onPomodoroComplete })
  const pomoRef = useRef(pomo)
  pomoRef.current = pomo

  const startTimerForTask = useCallback((id: string, text: string) => pomo.start({ taskId: id, taskText: text }), [pomo.start])

  const setPomodoroPrefs = (patch: Partial<PomodoroPrefs>) =>
    mutate((s) => ({ ...s, prefs: { ...s.prefs, pomodoro: { ...s.prefs.pomodoro, ...patch } } }))

  // Reflect the countdown in the tab title (visible on a backgrounded PWA).
  useEffect(() => {
    document.title =
      pomo.session && !pomo.isDone ? `${formatRemaining(pomo.remainingMs)} · Taskist` : 'Taskist'
  }, [pomo.session, pomo.remainingMs, pomo.isDone])

  // Unlock the audio context on first interaction so the completion chime can play.
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

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
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        navigator.clipboard.writeText(formatDayLog(dayRef.current)).catch(() => {})
        return
      }
      if (typing) return
      // Let browser/system chords through (⌘R reload, ⌘T new tab, ⌘F find, …);
      // our single-key shortcuts are unmodified only. (Undo/copy handled above.)
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '[') {
        e.preventDefault()
        setDate((d) => addDays(d, -1))
      } else if (e.key === ']') {
        e.preventDefault()
        setDate((d) => addDays(d, 1))
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault()
        setDate(todayStr())
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault()
        pomoRef.current.start()
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault()
        pomoRef.current.toggle()
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        pomoRef.current.skip()
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        pomoRef.current.reset()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Priority handlers
  const addPriority = (text: string, tier: Tier = DEFAULT_TIER) => {
    updateDay((d) => ({
      ...d,
      priorities: [
        ...d.priorities,
        { id: uid(), text, done: false, createdAt: Date.now(), tier } satisfies Priority,
      ],
    }))
  }
  const togglePriority = (id: string) =>
    updateDay((d) => {
      const target = d.priorities.find((p) => p.id === id)
      if (!target) return d
      const willBeDone = !target.done
      const nextPriorities = d.priorities.map((p) =>
        p.id === id ? { ...p, done: willBeDone } : p,
      )
      if (willBeDone) {
        if (store.prefs.autoLog && !d.log.some((e) => e.priorityId === id)) {
          const entry: LogEntry = {
            id: uid(),
            text: target.text,
            time: store.prefs.noTimeDefault ? null : nowTime(),
            createdAt: Date.now(),
            priorityId: id,
          }
          return { ...d, priorities: nextPriorities, log: [...d.log, entry] }
        }
        return { ...d, priorities: nextPriorities }
      }
      return {
        ...d,
        priorities: nextPriorities,
        log: d.log.filter((e) => e.priorityId !== id),
      }
    })
  const editPriority = (id: string, text: string) =>
    updateDay((d) => ({
      ...d,
      priorities: d.priorities.map((p) => (p.id === id ? { ...p, text } : p)),
    }))
  const setPriorityTier = (id: string, tier: Tier) =>
    updateDay((d) => ({
      ...d,
      priorities: d.priorities.map((p) => (p.id === id ? { ...p, tier } : p)),
    }))
  const deletePriority = (id: string) =>
    updateDay((d) => ({ ...d, priorities: d.priorities.filter((p) => p.id !== id) }))
  // Reorder within a tier by swapping with the in-tier neighbour, so it stays
  // correct even when the flat array interleaves tiers after a cross-tier drag.
  const reorderPriority = (id: string, dir: -1 | 1) =>
    updateDay((d) => {
      const item = d.priorities.find((p) => p.id === id)
      if (!item) return d
      const sameTier = d.priorities.filter((p) => p.tier === item.tier)
      const i = sameTier.findIndex((p) => p.id === id)
      const j = i + dir
      if (j < 0 || j >= sameTier.length) return d // tier boundary: no-op
      return { ...d, priorities: dragMove(d.priorities, id, sameTier[j].id, dir === -1) }
    })
  const movePriority = (draggedId: string, targetId: string, before: boolean) =>
    updateDay((d) => {
      const dragged = d.priorities.find((p) => p.id === draggedId)
      if (!dragged) return d
      // Drop into an empty section's drop-zone: just retier and append.
      if (targetId.startsWith('__empty_')) {
        const tier: Tier = targetId === '__empty_later' ? 'later' : 'today'
        const rest = d.priorities.filter((p) => p.id !== draggedId)
        return { ...d, priorities: [...rest, { ...dragged, tier }] }
      }
      const target = d.priorities.find((p) => p.id === targetId)
      if (!target) return d
      // Reposition, then inherit the drop target's tier (handles cross-tier drops).
      const reordered = dragMove(d.priorities, draggedId, targetId, before)
      return {
        ...d,
        priorities: reordered.map((p) => (p.id === draggedId ? { ...p, tier: target.tier } : p)),
      }
    })

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
  const moveLog = (draggedId: string, targetId: string, before: boolean) =>
    updateDay((d) => ({ ...d, log: dragMove(d.log, draggedId, targetId, before) }))

  const toggleNoTimeDefault = () =>
    mutate((s) => ({ ...s, prefs: { ...s.prefs, noTimeDefault: !s.prefs.noTimeDefault } }))

  const toggleAutoLog = () =>
    mutate((s) => ({ ...s, prefs: { ...s.prefs, autoLog: !s.prefs.autoLog } }))

  const copyDayLog = () => {
    navigator.clipboard.writeText(formatDayLog(day)).catch(() => {})
  }

  const setTheme = (theme: Theme) =>
    setStore((s) => ({ ...s, prefs: { ...s.prefs, theme } }))

  return (
    <div className="min-h-dvh bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 sm:px-10 py-8">
        <div className="flex items-center justify-between">
          <Logo />
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

        <div className="mt-8">
          <PomodoroTimer
            session={pomo.session}
            remainingMs={pomo.remainingMs}
            isDone={pomo.isDone}
            completionSignal={pomo.completionSignal}
            prefs={store.prefs.pomodoro}
            onStart={() => pomo.start()}
            onPause={pomo.pause}
            onResume={pomo.resume}
            onSkip={pomo.skip}
            onAdvance={pomo.advance}
            onReset={pomo.reset}
            onChangePrefs={setPomodoroPrefs}
          />
        </div>

        <main className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 lg:gap-x-14 gap-y-10">
          <PriorityColumn
            ref={priorityInputRef}
            priorities={day.priorities}
            activeTaskId={
              pomo.session && pomo.session.phase === 'work' && !pomo.isDone
                ? pomo.session.taskId
                : null
            }
            onAdd={addPriority}
            onToggle={togglePriority}
            onEdit={editPriority}
            onSetTier={setPriorityTier}
            onDelete={deletePriority}
            onReorder={reorderPriority}
            onMove={movePriority}
            onStartTimer={startTimerForTask}
          />
          <LogColumn
            ref={logInputRef}
            entries={day.log}
            noTimeDefault={store.prefs.noTimeDefault}
            autoLog={store.prefs.autoLog}
            onToggleNoTimeDefault={toggleNoTimeDefault}
            onToggleAutoLog={toggleAutoLog}
            onCopyDay={copyDayLog}
            onAdd={addLog}
            onEditText={editLogText}
            onEditTime={editLogTime}
            onDelete={deleteLog}
            onReorder={reorderLog}
            onMove={moveLog}
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

function dragMove<T extends { id: string }>(
  arr: T[],
  draggedId: string,
  targetId: string,
  before: boolean,
): T[] {
  if (draggedId === targetId) return arr
  const dragged = arr.find((x) => x.id === draggedId)
  if (!dragged) return arr
  const filtered = arr.filter((x) => x.id !== draggedId)
  const idx = filtered.findIndex((x) => x.id === targetId)
  if (idx === -1) return arr
  const insertIdx = before ? idx : idx + 1
  return [...filtered.slice(0, insertIdx), dragged, ...filtered.slice(insertIdx)]
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

