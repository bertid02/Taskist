# Taskist — Project Guide & Specification

A minimal, friction-free **daily tasking PWA**. This file is the source of truth for
agents working on the codebase: what the app *is*, how it's built, and the conventions
to preserve. Keep it current when behaviour or architecture changes.

---

## 1. What the app is

A single-screen daily planner with two columns:

- **Priorities** (left) — what you mean to do. Split into two tiers:
  - **Today** — committed must-dos for the day.
  - **Anytime** — a no-pressure backlog that's fine to roll into later days.
  Each tier has its **own input**, so you type a task straight into the group it belongs to.
- **Did** (right) — a timestamped log of what you actually did.

Core behaviours:
- **Rollover** — when a day is first opened, unfinished priorities from the most recent
  prior day are copied forward, **preserving their tier**. The original day is left intact.
- **Auto-log** — ticking a priority can auto-append a matching `Did` entry (pref-gated).
- **Focus timer** — a Pomodoro timer in a slim bar between the columns. Start a focus block
  on a task (`F` / play button) or untethered; a completed work block can auto-log to `Did`
  (pref-gated, deduped against the tick auto-log), then offers a break. Deadline-based and
  kept in its **own** `localStorage` key, outside the undo'd `Store` (see §3).
- **Keyboard-first** — almost everything is doable from the keyboard; mouse adds hover
  affordances and drag-to-reorder.
- **Local-only** — all state lives in `localStorage`. No backend, accounts, or sync.

Design language: calm, **monochrome neutral** palette (Tailwind `neutral-*` only), Inter
font, full light/dark/system theming. No accent colour — hierarchy comes from weight,
size, and contrast. Keep new UI consistent with this restraint.

---

## 2. Tech stack

- **React 18** + **TypeScript 5.6**, built with **Vite 5**.
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.*`; theme tokens live in
  `src/index.css` under `@theme`). Dark mode is a custom variant: `@custom-variant dark`.
- **vite-plugin-pwa** (`registerType: 'autoUpdate'`) — installable standalone PWA.
- No state library, no router, no test framework, no CSS-in-JS. Styling is Tailwind
  utility classes inline.

### Commands
```
npm install
npm run dev        # vite dev server
npm run build      # tsc -b && vite build  (typecheck + production build)
npm run typecheck  # tsc -b --noEmit
npm run preview    # serve the production build
```
There is **no linter or test suite**. `npm run build` is the gate — it typechecks the whole
project, and `tsconfig` is strict (incl. `noUnusedLocals`), so unused symbols fail the build.
Always run `npm run build` before committing.

---

## 3. Architecture & data model

### State
`App.tsx` holds the entire `Store` in one `useState` and persists it to `localStorage`
(key `taskist.v1`) on every change via a `useEffect`. There is no other state owner; child
components are controlled and call handler props back up to `App`.

```ts
Store = { version: 1; days: Record<string /*YYYY-MM-DD*/, Day>; prefs: Prefs }
Day   = { date: string; priorities: Priority[]; log: LogEntry[] }
Priority = { id; text; done; createdAt; tier: 'today' | 'later'; rolledOverFrom?: string }
LogEntry = { id; text; time: string|null /*HH:MM*/; createdAt; priorityId?: string }
Prefs    = { noTimeDefault: boolean; autoLog: boolean; theme: 'light'|'dark'|'system'; pomodoro: PomodoroPrefs }
PomodoroPrefs    = { workMin; shortBreakMin; longBreakMin; longBreakEvery; autoStartBreaks; autoStartWork; sound; notify; autoLogSessions }
PomodoroSession  = { phase: 'work'|'shortBreak'|'longBreak'; endsAt; durationMs; running; pausedRemainingMs?; taskId; taskText; completedWork; date }
```
Types live in `src/types.ts`. `DEFAULT_TIER = 'today'` is the single knob for where a brand-new
task lands when no tier is given. `DEFAULT_POMODORO` is the pomodoro-prefs default (25/5/15, long
break every 4, everything else off except `autoLogSessions`).

**Priorities are ONE flat array per day** with a `tier` field — *not* two arrays.
`PriorityColumn` filters it into `today` / `later` sub-lists for rendering. This keeps the
generic reorder/drag/keyboard machinery working across both tiers. Preserve this model.

### Key invariants & gotchas (do not regress)
- **Migration**: `storage.ts#load()` runs `normalizeDays`, which defaults any priority
  missing a `tier` to `'today'` (hardcoded — *not* `DEFAULT_TIER`, so pre-tier history isn't
  retroactively demoted if the default ever changes). The store stays **`version: 1`** — do
  **not** bump it; `load()` discards any store whose `version !== 1`, which would wipe users.
- **Flat array can interleave tiers** after a cross-tier drag. The rendered order is always
  derived (today group then later group), so:
  - `reorderPriority` (Alt+↑/↓) swaps by **in-tier neighbour id**, not by raw array index.
  - keyboard navigation and delete-focus are computed from the grouped view, not raw order.
- **Cross-tier drag**: `movePriority` repositions then stamps the dragged item's `tier` to the
  **drop target's** tier. Dropping onto an empty section uses sentinel target ids
  `__empty_today` / `__empty_later` (handled specially in `movePriority`).
- **Undo**: every mutation goes through `App.tsx#mutate`, which pushes a `structuredClone`
  of the prior store onto `undoStack` (cap 50). New mutating handlers must route through
  `mutate`/`updateDay` to get undo + persistence for free.
- **Rollover** (`lib/rollover.ts#ensureDay`) copies unfinished priorities forward with **new
  ids**, sets `tier: p.tier`, and chains `rolledOverFrom` back to the origin date. It runs on
  mount, on `window` focus, and on a 60s interval (handles overnight sessions).
- **Pomodoro state is NOT in the `Store`.** The live session lives in its own localStorage key
  `taskist.pomodoro.v1` (`lib/pomodoro.ts`), written only on transitions — *never per tick*.
  This is deliberate: routing a 1Hz countdown through `mutate` would rewrite `taskist.v1` and
  flood the 50-deep undo stack every second, and `⌘Z` could rewind a running timer. Remaining
  time is **derived** from the absolute `endsAt` (`endsAt - Date.now()`), so it's drift-free
  across throttled background tabs, sleep, and reload; `usePomodoro` recomputes on
  `visibilitychange`/`focus` and fires completion exactly once (guarded by an `endsAt` ref).
- **Pomodoro prefs migrate by deep-merge.** `load()` does `pomodoro: { ...DEFAULT_POMODORO,
  ...stored }` so adding a sub-field later still defaults cleanly. Still **`version: 1`** — never
  bump.
- **Completion side-effects are undoable; ticking is not.** A finished work block logs through
  the normal `mutate` path but to the **session's own day** (`s.date` via `ensureDay`, not the
  viewed `date`) so a block finishing after midnight / while viewing another day lands correctly;
  it dedupes against an existing `priorityId` log entry. On reload past `endsAt`, the session is
  restored as *finished/awaiting-ack* and does **not** auto-log (avoids a false record).

---

## 4. File map

```
src/
  App.tsx                  Root: owns Store, all handlers, global keyboard shortcuts,
                           theme application, undo stack, date navigation.
  main.tsx                 React root + PWA service-worker registration.
  index.css                Tailwind import, @theme tokens (--font-sans: Inter), dark variant.
  types.ts                 All types + emptyStore() + DEFAULT_TIER.
  storage.ts               load()/save() to localStorage + normalizeDays() migration.
  components/
    PriorityColumn.tsx     Two-tier Priorities column (Today/Anytime). Per-tier input,
                           grouped rendering, keyboard nav, drag, move-tier (M / button),
                           empty-section drop zones. forwardRef = the Today input.
    LogColumn.tsx          Did column: input, entries, editable time, auto-log/no-time
                           toggles, copy-day button.
    PomodoroTimer.tsx      Slim focus-timer bar between the columns: idle/work/break/paused/
                           done states (monochrome, fill-vs-outline), progress underline,
                           controls, collapsible settings disclosure. Controlled by App.
    DateHeader.tsx         Big date label + prev/next/today navigation.
    EditableText.tsx       Reusable click-to-edit text (Enter commit, Esc cancel, blur commit).
    KeyboardHints.tsx      Collapsible shortcut reference (static `hints` array).
    ThemeToggle.tsx        light/dark/system switcher.
    Logo.tsx, icons.tsx    Branding + inline SVG icons (shared `baseProps`, 12×12, currentColor).
  lib/
    rollover.ts            ensureDay(): create a day, carrying tier-preserved rollovers.
    date.ts                todayStr, formatDate, parseDate, addDays, nowTime, displayDate,
                           normalizeTime ("9:5" → "09:05").
    clipboard.ts           formatDayLog(): day → timesheet-style plain text.
    pomodoro.ts            Pure pomodoro logic + the `taskist.pomodoro.v1` session load/save:
                           phaseDurationMs, nextPhase (long-break cadence), remainingMs,
                           formatRemaining.
    usePomodoro.ts         The timing engine hook: owns the session, the ~250ms display tick,
                           transition→persist, visibility/focus recompute, single-fire
                           completion. Exposes start/pause/resume/toggle/skip/reset.
    chime.ts               Synthesized completion beep (Web Audio, gesture-unlocked, no asset).
    useDragSort.ts         HTML5 drag-sort hook + dropShadow() drop indicator.
    uid.ts                 random id generator.
```

---

## 5. Interaction model (preserve these)

### Keyboard
| Key | Action |
| --- | --- |
| `Enter` (in input) | Add the input's text to that tier / the log |
| `↑` / `↓` | Navigate continuously through inputs and items (across the divider) |
| `Space` | Tick / untick the focused priority |
| `Enter` (on item) | Edit |
| `Esc` | Stop editing / return to the section input |
| `Alt + ↑/↓` | Reorder within the tier (no-op at a tier boundary) |
| `M` | Move the focused priority between Today / Anytime |
| `⌘/Ctrl + ⌫` | Delete the focused item |
| `⌘/Ctrl + Z` | Undo |
| `⌘/Ctrl + Shift + L` | Copy the day's log to clipboard |
| `[` / `]` | Previous / next day |
| `T` | Jump to today |
| `F` | Start a focus block — bound to the focused priority, else untethered (no-op mid-work) |
| `P` | Pause / resume (or start, if idle) the timer |
| `S` | Skip to the next phase |
| `R` | Cancel the timer |

Global shortcuts (`[ ] T`, `P S R`, undo, copy) live in `App.tsx`; per-item/input keys live in
the column components. `F` is dual: the focused priority row handles it (task-bound) in
`PriorityColumn`, and the global handler handles the untethered case — double-firing is harmless
because `start` is a no-op while a work block is running. App reads the timer via a `pomoRef`
(the global keydown effect has empty deps), mirroring the existing `dayRef`/`undoStack` pattern.
Letter shortcuts on rows are safe because rows are focusable `<div>`s, not inputs — but always
early-return when an item is being edited / typing.

### Mouse
- Hover a row → focus-timer / move-tier / edit / delete buttons appear.
- Click a priority row → toggle done. Double-click → edit. The row bound to the running timer
  shows a subtle inset ring.
- Drag rows to reorder; drag a priority across the divider (or onto an empty section's drop
  zone) to change its tier.
- The timer bar: play/pause/skip/cancel controls, and a `25 · 5` toggle that opens settings.

### Visual hierarchy (current)
- Section headers **Today / Anytime / Did** share one strong style:
  `text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400`.
  They are peers and their inputs align across columns — keep this parallelism if you add
  headers. (There is intentionally **no "Priorities" umbrella header** — it was removed so the
  left/right inputs line up.)
- Inputs: soft-filled, full rounded border, leading `+` glyph, visible focus ring — the same
  treatment in both columns.

> **Known naming nuance:** the "Today" tier label can read oddly when the date header is on a
> different day (e.g. "Today" section under a "Tomorrow" date). Renaming the `today` tier's
> *display label* to "Must-do" is a one-line change (the stored value stays `'today'`). Left as
> "Today" by user choice; revisit if it causes confusion.

---

## 6. Deploy

- GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes to **GitHub Pages**.
- Vite `base` is `/Taskist/` for production builds (`vite.config.ts`) — keep this if the repo
  name / Pages path changes.
- The workflow triggers on pushes to `main` and `claude/**`, **but the `github-pages`
  environment only permits deploys from `main`**, so feature-branch runs fail fast by design.
  **To deploy a change, it must land on `main`** (open a PR and merge). Live at
  `https://bertid02.github.io/Taskist/`.

---

## 7. Conventions for future work

- **Match the surrounding code**: inline Tailwind utilities, neutral-only palette, no new
  dependencies unless clearly justified. No comments unless they explain a non-obvious *why*.
- **Persistence/undo**: route all store mutations through `mutate` / `updateDay` in `App.tsx`.
- **New `Priority` fields**: add a migration default in `normalizeDays`, cover every
  `Priority` construction site (the `satisfies Priority` annotations will fail the build if you
  miss one — currently `addPriority` in `App.tsx` and the map in `rollover.ts`), and never bump
  the store `version`.
- **New `Prefs` fields**: default them in `load()`'s prefs spread and `emptyStore()` (never bump
  `version`). New `PomodoroPrefs` sub-fields just need a default in `DEFAULT_POMODORO` — the
  deep-merge in `load()` covers migration.
- **Real-time / transient state stays out of `Store`.** The pomodoro session is the template:
  its own localStorage key, written on transitions only, never through `mutate`. Anything that
  ticks or shouldn't be undoable belongs outside the `Store`.
- **Verify**: run `npm run build` (typecheck + build). There is no test suite, so also sanity-
  check behaviour in `npm run dev` — and note that this environment has **no headless browser**,
  so interactive checks must be eyeballed locally.
- Update **this file**, the **README**, and **KeyboardHints** when you change behaviour,
  shortcuts, or architecture.
