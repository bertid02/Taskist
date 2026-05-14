# Taskist

A simple, friction-free daily tasking app. Two columns: **Priorities** (what
you mean to do) on the left, **Log** (what you actually did, timestamped) on
the right. Unfinished priorities roll over to the next day automatically.

## Run

```
npm install
npm run dev
```

Then open the URL Vite prints.

## Build

```
npm run build
npm run preview
```

The built site is fully static and lives in `dist/` — drop it on any static
host (GitHub Pages, Netlify, S3, etc.).

## Keyboard

| Key             | Action                                |
| --------------- | ------------------------------------- |
| `Enter`         | Add the input's text                  |
| `Tab`           | Move between Priorities and Log inputs |
| `↑` / `↓`       | Navigate items in the focused column  |
| `Space`         | Tick off a focused priority           |
| `Enter` on item | Edit                                  |
| `Esc`           | Stop editing / leave the list         |
| `Alt + ↑ / ↓`   | Reorder a focused item                |
| `⌘/Ctrl + ⌫`    | Delete the focused item               |
| `⌘/Ctrl + Z`    | Undo                                  |
| `⌘/Ctrl + Shift + T` | Toggle timestamp on a log entry  |
| `[` / `]`       | Previous / next day                   |
| `T`             | Jump to today                         |

Mouse: hover any row for edit / delete affordances, or drag rows to reorder.

## Storage

Everything lives in `localStorage` under the key `taskist.v1`. No backend, no
accounts, no sync — single browser only.
