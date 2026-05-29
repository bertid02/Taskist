# Taskist

A simple, friction-free daily tasking app. Two columns: **Priorities** (what
you mean to do) on the left, **Did** (what you actually did, timestamped) on
the right. Unfinished priorities roll over to the next day automatically.

Priorities are split into two tiers, each with its own input so you type a task
straight into the group it belongs to:

- **Today** — what you've committed to getting done today.
- **Anytime** — a no-pressure running list that's fine to roll into later days.

Both tiers roll over (keeping their tier) when left unfinished. Move a task
between tiers any time by dragging it across the divider, using the move button
on hover, or pressing `M` on a focused task.

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
| `Tab`           | Move between Priorities and Did inputs |
| `↑` / `↓`       | Navigate items in the focused column  |
| `Space`         | Tick off a focused priority           |
| `Enter` on item | Edit                                  |
| `Esc`           | Stop editing / leave the list         |
| `Alt + ↑ / ↓`   | Reorder a focused item                |
| `M`             | Move a priority between Today / Anytime |
| `⌘/Ctrl + ⌫`    | Delete the focused item               |
| `⌘/Ctrl + Z`    | Undo                                  |
| `⌘/Ctrl + Shift + T` | Toggle timestamp on a log entry  |
| `⌘/Ctrl + Shift + L` | Copy the day to clipboard        |
| `[` / `]`       | Previous / next day                   |
| `T`             | Jump to today                         |

Mouse: hover any row for move / edit / delete affordances, or drag rows to
reorder — drag a priority across the divider to move it between Today and Anytime.

## Storage

Everything lives in `localStorage` under the key `taskist.v1`. No backend, no
accounts, no sync — single browser only.

## Deploy

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the app
and publishes it to GitHub Pages on every push to `main` (and `claude/**`
branches). To enable:

1. Repo **Settings → Pages → Source** → "GitHub Actions".
2. Push to `main` (or run the workflow manually from the Actions tab).

The site lives at `https://bertid02.github.io/Taskist/`. Visit it in Chrome
and pick "Install Taskist" from the address bar / menu to add it to the
dock as a standalone app — no terminal required to launch it after that.
