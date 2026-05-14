import { forwardRef, useRef, useState, type KeyboardEvent } from 'react'
import type { LogEntry } from '../types'
import { EditableText } from './EditableText'
import { normalizeTime, nowTime } from '../lib/date'
import { XIcon } from './icons'
import { dropShadow, useDragSort } from '../lib/useDragSort'

type Props = {
  entries: LogEntry[]
  /** When true, new entries are added with no timestamp by default. */
  noTimeDefault: boolean
  onToggleNoTimeDefault: () => void
  onAdd: (text: string, time: string | null) => void
  onEditText: (id: string, text: string) => void
  onEditTime: (id: string, time: string | null) => void
  onDelete: (id: string) => void
  onReorder: (id: string, dir: -1 | 1) => void
  onMove: (draggedId: string, targetId: string, before: boolean) => void
}

type EditMode = { id: string; field: 'text' | 'time' } | null

export const LogColumn = forwardRef<HTMLInputElement, Props>(function LogColumn(
  { entries, noTimeDefault, onToggleNoTimeDefault, onAdd, onEditText, onEditTime, onDelete, onReorder, onMove },
  inputRef,
) {
  const [draft, setDraft] = useState('')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditMode>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const drag = useDragSort<LogEntry>(onMove)

  const focusItem = (id: string | null) => {
    setFocusedId(id)
    requestAnimationFrame(() => {
      if (id) itemRefs.current.get(id)?.focus()
      else (inputRef as React.RefObject<HTMLInputElement>)?.current?.focus()
    })
  }

  const handleInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = draft.trim()
      if (t) {
        onAdd(t, noTimeDefault ? null : nowTime())
        setDraft('')
      }
    } else if (e.key === 'ArrowDown' && entries.length > 0) {
      e.preventDefault()
      focusItem(entries[0].id)
    }
  }

  const handleItemKey = (e: KeyboardEvent<HTMLDivElement>, entry: LogEntry, idx: number) => {
    if (editing?.id === entry.id) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (e.altKey) {
        if (idx < entries.length - 1) onReorder(entry.id, 1)
      } else if (idx < entries.length - 1) {
        focusItem(entries[idx + 1].id)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (e.altKey) {
        if (idx > 0) onReorder(entry.id, -1)
      } else if (idx > 0) {
        focusItem(entries[idx - 1].id)
      } else {
        focusItem(null)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      focusItem(null)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      setEditing({ id: entry.id, field: 'text' })
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault()
      onEditTime(entry.id, entry.time ? null : nowTime())
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
      e.preventDefault()
      const next = entries[idx + 1] ?? entries[idx - 1]
      onDelete(entry.id)
      focusItem(next?.id ?? null)
    }
  }

  return (
    <section className="flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
          Log
        </h2>
        <button
          type="button"
          onClick={onToggleNoTimeDefault}
          className={`text-[11px] tracking-wide transition-colors ${
            noTimeDefault
              ? 'text-neutral-700 dark:text-neutral-300'
              : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400'
          }`}
          title="Toggle whether new entries get an automatic timestamp"
          aria-pressed={noTimeDefault}
        >
          no time
        </button>
      </div>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleInputKey}
        placeholder="What did you do?"
        className="w-full bg-transparent border-b border-neutral-200 dark:border-neutral-800 py-3 text-[15px] placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
        aria-label="Add a log entry"
      />
      <ul className="mt-1">
        {entries.map((entry, idx) => {
          const isFocused = focusedId === entry.id
          const isEditingText = editing?.id === entry.id && editing.field === 'text'
          const isEditingTime = editing?.id === entry.id && editing.field === 'time'
          const isEditing = editing?.id === entry.id
          const isDragging = drag.dragId === entry.id
          const isDropTarget = drag.dropTarget?.id === entry.id
          return (
            <li key={entry.id}>
              <div
                ref={(el) => {
                  if (el) itemRefs.current.set(entry.id, el)
                  else itemRefs.current.delete(entry.id)
                }}
                tabIndex={-1}
                draggable={!isEditing}
                onDragStart={(e) => drag.onDragStart(e, entry)}
                onDragOver={(e) => drag.onDragOver(e, entry)}
                onDrop={(e) => drag.onDrop(e, entry)}
                onDragEnd={drag.onDragEnd}
                onKeyDown={(e) => handleItemKey(e, entry, idx)}
                onFocus={() => setFocusedId(entry.id)}
                style={{
                  boxShadow: dropShadow(isDropTarget, drag.dropTarget?.before),
                }}
                className={`group flex items-center gap-3 px-3 py-2 -mx-3 rounded-md select-none transition-colors cursor-grab active:cursor-grabbing ${
                  isFocused ? 'bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                } ${isDragging ? 'opacity-40' : ''}`}
              >
                <div
                  className="flex-1 min-w-0 text-[15px] text-neutral-900 dark:text-neutral-100 cursor-text"
                  onClick={() => setEditing({ id: entry.id, field: 'text' })}
                >
                  <EditableText
                    value={entry.text}
                    editing={isEditingText}
                    onCommit={(next) => {
                      setEditing(null)
                      if (next === '') onDelete(entry.id)
                      else if (next !== entry.text) onEditText(entry.id, next)
                      focusItem(entry.id)
                    }}
                    onCancel={() => {
                      setEditing(null)
                      focusItem(entry.id)
                    }}
                  />
                </div>
                <div
                  className="shrink-0 text-xs tabular-nums text-neutral-400 dark:text-neutral-500 cursor-text w-12 text-right"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing({ id: entry.id, field: 'time' })
                  }}
                  title={entry.time ? 'Click to edit time' : 'Click to add time'}
                >
                  {isEditingTime ? (
                    <EditableText
                      value={entry.time ?? ''}
                      editing
                      allowEmpty
                      onCommit={(next) => {
                        setEditing(null)
                        if (next === '') {
                          if (entry.time !== null) onEditTime(entry.id, null)
                        } else {
                          const normalized = normalizeTime(next)
                          if (normalized && normalized !== entry.time) {
                            onEditTime(entry.id, normalized)
                          }
                        }
                        focusItem(entry.id)
                      }}
                      onCancel={() => {
                        setEditing(null)
                        focusItem(entry.id)
                      }}
                      className="text-right"
                    />
                  ) : entry.time ? (
                    entry.time
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">— : —</span>
                  )}
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    draggable={false}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(entry.id)
                    }}
                    title="Delete"
                    aria-label="Delete"
                    className="grid place-items-center w-6 h-6 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-500 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
})
