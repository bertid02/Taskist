# CLAUDE.md — Taskist

Project context for Claude Code. Read this first when picking up work.

## What this is

**Taskist** — a friction-free daily tasking web app. Two columns:

- **Priorities** (left): what you mean to do. A rolling list — unfinished items
  automatically carry over to the next day so nothing gets forgotten.
- **Did** (right): what you actually did, each entry timestamped (`HH:MM`).
  Used together with Priorities to fill in an external project-management
  timesheet.

Single-user, single-browser, no backend, no accounts. All state lives in
`localStorage`. Designed to be keyboard-first and visually quiet/minimal.

The owner uses it like this: priorities are an ongoing backlog he adds to as
things come up; the Did column captures both completed priorities and the
unplanned work that crops up during the day; he reads both columns to enter
work logs into his company's PM portal.

## Tech stack

- **Vite + React 18 + TypeScript** (strict mode).
- **Tailwind CSS v4** (via `@tailwindcss/vite`; config is in `src/index.css`
  using `@theme` / `@custom-variant`, NOT a `tailwind.config.js`).
- **vite-plugin-pwa** — installable PWA with an auto-updating service worker.
- Deployed as a static site to **GitHub Pages** via GitHub Actions.
- Node 22 locally; the Pages workflow uses Node 20.

## Commands

```
npm install        # first time
npm run dev         # local dev server (Vite prints the URL)
npm run build       # tsc -b && vite build  → dist/
npm run preview     # serve the production build
npm run typecheck   # tsc -b --noEmit
```

There are **no tests** and **no linter** configured. "Verify" means
`npm run build` passes (it runs `tsc -b` first, so it catches type errors).

## Architecture / where things live

- `src/types.ts` — data model. `Priority`, `LogEntry`, `Day`, `Prefs`, `Store`.
- `src/storage.ts` — `load()` / `save()` to `localStorage` key `taskist.v1`.
  `load()` merges defaults into `prefs` so older saved data keeps working.
- `src/App.tsx` — the brain. Holds the `Store` in state, persists on every
  change, manages the viewed `date`, the undo stack, global keyboard shortcuts,
  theme application, and all the handlers passed to the columns.
- `src/lib/`
  - `date.ts` — `todayStr()`, `addDays()`, `formatDate()`, `parseDate()`,
    `displayDate()` (→ "Today"/"Yesterday"/formatted), `nowTime()`,
    `normalizeTime()`.
  - `rollover.ts` — `ensureDay(store, date)`: creates a Day if missing, copying
    unfinished priorities forward from the most recent prior day. Done
    priorities are NOT carried. `rolledOverFrom` chains back to the origin date.
  - `uid.ts` — id generator (`crypto.randomUUID` with fallback).
  - `useDragSort.ts` — HTML5 drag-and-drop sorting hook + `dropShadow()` helper.
  - `clipboard.ts` — `formatDayLog(day)`: the Did column as plain text for
    pasting into a timesheet.
- `src/components/`
  - `PriorityColumn.tsx` / `LogColumn.tsx` — the two columns (note: the right
    component is still named `LogColumn` internally; only its visible header
    says "Did").
  - `DateHeader.tsx` — date + prev/next day arrows + "Jump to today".
  - `EditableText.tsx` — shared click-to-edit text primitive.
  - `ThemeToggle.tsx` — light/system/dark segmented control.
  - `Logo.tsx` — the two-bar icon + "Taskist" wordmark lockup.
  - `KeyboardHints.tsx` — collapsible shortcut legend at the bottom.
  - `icons.tsx` — `PencilIcon`, `XIcon`, `HistoryIcon`.

### Key patterns to reuse

- **All mutations go through `mutate()` / `updateDay()` in `App.tsx`.** They
  push a snapshot onto the undo stack (cap 50) before applying, so undo
  (`Cmd/Ctrl+Z`) works automatically. Don't call `setStore` directly for data
  changes — only for undo restore, theme, and rollover.
- Adding a feature that touches a day's data = add a handler in `App.tsx` that
  calls `updateDay`, then thread it down as a prop to the relevant column.
- The two header toggles in `LogColumn` (`no time`, `auto-log`) share the
  `HeaderToggle` sub-component — copy that for any new header toggle.

## Data model (current shape)

```ts
Priority = { id, text, done, createdAt, rolledOverFrom? }   // rolledOverFrom = origin YYYY-MM-DD
LogEntry = { id, text, time: string|null, createdAt, priorityId? } // priorityId set when auto-logged
Day      = { date: 'YYYY-MM-DD', priorities: Priority[], log: LogEntry[] }
Prefs    = { noTimeDefault: boolean, autoLog: boolean, theme: 'light'|'dark'|'system' }
Store    = { version: 1, days: Record<date, Day>, prefs: Prefs }
```

**Schema changes must stay backward-compatible**: add optional fields, and add
defaults in `storage.ts` `load()`. Don't break existing `taskist.v1` data.
If a breaking change is ever truly needed, bump `version` and migrate in
`load()`.

## Features implemented (current state)

- Two columns with always-focused add inputs; Enter to add.
- Tick a priority: click the row, or `Space` when focused.
- **Auto-log**: ticking a priority appends a matching `Did` entry (with current
  time) and links it via `priorityId`; unticking removes that entry. Toggleable
  via the `auto-log` header button (default ON). Auto-logged entries show a
  small `↗`.
- Click-to-edit text (both columns) and time (Did column). `normalizeTime`
  validates `HH:MM`.
- Per-row hover actions: edit (priorities) and delete (both). Drag rows to
  reorder; or `Alt+↑/↓` by keyboard.
- **Rollover**: unfinished priorities carry to the next day; carried items show
  a clock-history icon (`HistoryIcon`) with a "Carried over from <date>"
  tooltip. Checked on window focus and every 60s.
- **Date navigation**: prev/next arrows, `[` / `]`, `T` for today,
  "Jump to today" link. Can view/edit past and future days.
- **Copy day**: `copy` link in the Did header + `Cmd/Ctrl+Shift+L` →
  `formatDayLog()` to clipboard. (Note: `Cmd+Shift+C` was avoided because Chrome
  reserves it for devtools.)
- Item counts in both headers (`Priorities · 3 left` / `all done`, `Did · 5`).
- **Undo**: `Cmd/Ctrl+Z`, 50 deep.
- **Theme**: light/dark/system, persisted, class-based dark mode, follows OS in
  system mode. Smooth color transition.
- **PWA**: installable; service worker auto-updates on new deploys.

## Deployment

- Workflow: `.github/workflows/deploy.yml` — builds and publishes `dist/` to
  GitHub Pages on push to `main` (and `claude/**` branches, though only `main`
  can actually deploy due to the `github-pages` environment protection rule).
- Pages **Source** is set to "GitHub Actions" in repo settings (already done).
- Live URL: `https://bertid02.github.io/Taskist/`
- `vite.config.ts` sets `base: '/Taskist/'` for production builds so asset
  paths resolve on the project Pages path. (If the repo is ever renamed, update
  this base.)
- The deployed site and `localhost` dev have **separate** localStorage — they
  do not share data.

## Git / workflow conventions

- Development branch: **`claude/task-priority-app-s9TrO`**. Develop, commit, and
  push here.
- Only `main` can trigger a successful Pages deploy (environment protection).
  To ship: open a PR from the dev branch to `main` and merge it (the owner does
  this on github.com; the sandbox cannot push to `main`).
- Push with `git push -u origin claude/task-priority-app-s9TrO`.

## ⚠️ Outstanding / pick up here

As of the last session (latest commit `e811b8a`):

1. **The dev branch is 6 commits ahead of `main` and has NOT been merged.**
   `main` is still at the initial commit, so **the live GitHub Pages site does
   not yet reflect any of the app** (or only an older deploy if one was merged
   manually). **Next action: merge `claude/task-priority-app-s9TrO` → `main`**
   on github.com to deploy the current app. Confirm the Actions run goes green.
2. Everything in the working tree is committed and pushed — clean state.

## Possible future ideas (not committed to)

- Search across days / jump to a date.
- Export / import all data as JSON (backup, or migrate localhost → deployed).
- Weekly summary / "what did I do this week" view for timesheets.
- Tags or simple grouping (deliberately omitted so far to keep it frictionless).
- Mobile-optimized layout (currently responsive but desktop-first).
