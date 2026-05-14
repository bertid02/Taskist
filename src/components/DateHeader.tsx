import { displayDate, parseDate, todayStr } from '../lib/date'

type Props = {
  date: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function DateHeader({ date, onPrev, onNext, onToday }: Props) {
  const isToday = date === todayStr()
  const label = displayDate(date)
  const sub =
    isToday || label === 'Yesterday' || label === 'Tomorrow'
      ? parseDate(date).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      : null

  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous day"
        className="p-2 -m-2 text-neutral-300 dark:text-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
      >
        <Chevron dir="left" />
      </button>

      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
          {label}
        </h1>
        {sub && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{sub}</span>
        )}
        {!isToday && (
          <button
            type="button"
            onClick={onToday}
            className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 mt-1 transition-colors"
          >
            Jump to today
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        aria-label="Next day"
        className="p-2 -m-2 text-neutral-300 dark:text-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
      >
        <Chevron dir="right" />
      </button>
    </header>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === 'left' ? <path d="M10 4 L6 8 L10 12" /> : <path d="M6 4 L10 8 L6 12" />}
    </svg>
  )
}
