const baseProps = {
  width: 12,
  height: 12,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function PencilIcon() {
  return (
    <svg {...baseProps} aria-hidden>
      <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" />
      <path d="M10 4l2 2" />
    </svg>
  )
}

export function XIcon() {
  return (
    <svg {...baseProps} aria-hidden>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export function HistoryIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5.5 V8 L10 9.25" />
    </svg>
  )
}
