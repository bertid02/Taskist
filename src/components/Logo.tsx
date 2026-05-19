export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg
        width="20"
        height="20"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="text-neutral-900 dark:text-neutral-100"
      >
        <rect x="6" y="6" width="8" height="20" rx="2" fill="currentColor" />
        <rect x="18" y="6" width="8" height="20" rx="2" fill="currentColor" opacity="0.45" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        Taskist
      </span>
    </span>
  )
}
