import type { Day } from '../types'

/**
 * Format a day's log entries as plain text suitable for pasting into a
 * timesheet / project-management system. One entry per line, with the time
 * left, separated from the text by two spaces. Entries with no time are
 * indented to align under timestamped ones.
 */
export function formatDayLog(day: Day): string {
  return day.log
    .map((entry) => {
      const prefix = entry.time ? entry.time : '     '
      return `${prefix}  ${entry.text}`
    })
    .join('\n')
}
