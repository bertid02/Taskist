// Shared class for the small 6×6 icon buttons used across the columns and the
// timer bar. Kept in one place so the hover/focus treatment can't drift, and so
// keyboard focus is always visible (the global :focus outline is disabled).
export const iconButtonClass =
  'grid place-items-center w-6 h-6 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 ' +
  'dark:text-neutral-500 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/60 transition-colors ' +
  'focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700'

// Reveal-on-interaction for hover action clusters: visible on row hover, on
// keyboard focus within the row (group-focus-within), and always on touch
// devices where there is no hover.
export const revealOnInteract =
  'opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 ' +
  'focus-within:opacity-100 [@media(hover:none)]:opacity-100'
