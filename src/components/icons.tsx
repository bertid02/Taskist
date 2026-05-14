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
