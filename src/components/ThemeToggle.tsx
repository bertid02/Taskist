import type { Theme } from '../types'

type Props = {
  theme: Theme
  onChange: (next: Theme) => void
}

export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-px p-0.5 rounded-full border border-neutral-200 dark:border-neutral-800"
    >
      <Option current={theme} value="light" onChange={onChange} label="Light">
        <SunIcon />
      </Option>
      <Option current={theme} value="system" onChange={onChange} label="System">
        <SystemIcon />
      </Option>
      <Option current={theme} value="dark" onChange={onChange} label="Dark">
        <MoonIcon />
      </Option>
    </div>
  )
}

function Option({
  current,
  value,
  onChange,
  label,
  children,
}: {
  current: Theme
  value: Theme
  onChange: (t: Theme) => void
  label: string
  children: React.ReactNode
}) {
  const active = current === value
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={() => onChange(value)}
      className={`grid place-items-center w-6 h-6 rounded-full transition-colors ${
        active
          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
          : 'text-neutral-400 hover:text-neutral-700 dark:text-neutral-600 dark:hover:text-neutral-300'
      }`}
    >
      {children}
    </button>
  )
}

const IconProps = {
  width: 12,
  height: 12,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function SunIcon() {
  return (
    <svg {...IconProps} aria-hidden>
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.4 3.4l1.05 1.05M11.55 11.55l1.05 1.05M3.4 12.6l1.05-1.05M11.55 4.45l1.05-1.05" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...IconProps} aria-hidden>
      <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SystemIcon() {
  return (
    <svg {...IconProps} aria-hidden>
      <rect x="2" y="3" width="12" height="8" rx="1" />
      <path d="M6 14h4M8 11v3" />
    </svg>
  )
}
