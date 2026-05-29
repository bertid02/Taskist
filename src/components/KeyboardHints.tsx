import { useState } from 'react'

const hints: Array<{ k: string; desc: string }> = [
  { k: 'Enter', desc: 'Add' },
  { k: 'Space', desc: 'Tick off' },
  { k: 'Tab', desc: 'Switch column' },
  { k: '↑ ↓', desc: 'Navigate' },
  { k: 'Alt + ↑ ↓', desc: 'Reorder' },
  { k: 'M', desc: 'Move to other tier' },
  { k: '[ ]', desc: 'Prev / next day' },
  { k: 'T', desc: 'Today' },
  { k: '⌘Z', desc: 'Undo' },
  { k: '⌘⇧T', desc: 'Toggle timestamp' },
  { k: '⌘⇧L', desc: 'Copy day to clipboard' },
]

export function KeyboardHints() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-20 flex flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[11px] tracking-wide text-neutral-300 dark:text-neutral-700 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors"
      >
        {open ? 'Hide shortcuts' : 'Shortcuts'}
      </button>
      <div
        className={`grid transition-all duration-200 ease-out overflow-hidden ${
          open ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'
        }`}
      >
        <div className="min-h-0">
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-neutral-400 dark:text-neutral-500">
            {hints.map((h) => (
              <li key={h.k} className="inline-flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 font-medium tabular-nums">
                  {h.k}
                </kbd>
                <span>{h.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
