import { displayDate, parseDate, todayStr } from '../lib/date'

type Props = {
  date: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

const navButton =
  'grid place-items-center w-9 h-9 rounded-full text-neutral-400 dark:text-neutral-500 ' +
  'hover:text-neutral-900 dark:hover:text-neutral-100 ' +
  'hover:bg-neutral-100 dark:hover:bg-neutral-900 ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700 ' +
  'transition-colors'

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
      <button type="button" onClick={onPrev} aria-label="Previous day" className={navButton}>
        <Chevron dir="left" />
      </button>

      <div className="flex flex-col items-center">
        <h1 className="text-[36px] leading-none font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          {label}
        </h1>
        {sub && (
          <span className="text-[11px] tracking-wide text-neutral-400 dark:text-neutral-500 mt-2.5">
            {sub}
          </span>
        )}
        {!isToday && (
          <button
            type="button"
            onClick={onToday}
            className="text-[11px] tracking-wide text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mt-2 transition-colors"
          >
            Jump to today
          </button>
        )}
      </div>

      <button type="button" onClick={onNext} aria-label="Next day" className={navButton}>
        <Chevron dir="right" />
      </button>
    </header>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {dir === 'left' ? <path d="M10 4 L6 8 L10 12" /> : <path d="M6 4 L10 8 L6 12" />}
    </svg>
  )
}
