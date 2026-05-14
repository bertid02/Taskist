import { forwardRef, useRef, useState, type KeyboardEvent } from 'react'
import type { Priority } from '../types'
import { EditableText } from './EditableText'

type Props = {
  priorities: Priority[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onEdit: (id: string, text: string) => void
  onDelete: (id: string) => void
  onReorder: (id: string, dir: -1 | 1) => void
}

export const PriorityColumn = forwardRef<HTMLInputElement, Props>(function PriorityColumn(
  { priorities, onAdd, onToggle, onEdit, onDelete, onReorder },
  inputRef,
) {
  const [draft, setDraft] = useState('')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

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
        onAdd(t)
        setDraft('')
      }
    } else if (e.key === 'ArrowDown' && priorities.length > 0) {
      e.preventDefault()
      focusItem(priorities[0].id)
    }
  }

  const handleItemKey = (e: KeyboardEvent<HTMLDivElement>, p: Priority, idx: number) => {
    if (editingId === p.id) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (e.altKey) {
        if (idx < priorities.length - 1) onReorder(p.id, 1)
      } else if (idx < priorities.length - 1) {
        focusItem(priorities[idx + 1].id)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (e.altKey) {
        if (idx > 0) onReorder(p.id, -1)
      } else if (idx > 0) {
        focusItem(priorities[idx - 1].id)
      } else {
        focusItem(null)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      focusItem(null)
    } else if (e.key === ' ') {
      e.preventDefault()
      onToggle(p.id)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      setEditingId(p.id)
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
      e.preventDefault()
      const next = priorities[idx + 1] ?? priorities[idx - 1]
      onDelete(p.id)
      focusItem(next?.id ?? null)
    }
  }

  return (
    <section className="flex flex-col min-w-0">
      <ColumnHeader label="Priorities" />
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleInputKey}
        placeholder="What's a priority?"
        className="w-full bg-transparent border-b border-neutral-200 dark:border-neutral-800 py-3 text-[15px] placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
        aria-label="Add a priority"
      />
      <ul className="mt-1">
        {priorities.map((p, idx) => {
          const isFocused = focusedId === p.id
          const isEditing = editingId === p.id
          return (
            <li key={p.id}>
              <div
                ref={(el) => {
                  if (el) itemRefs.current.set(p.id, el)
                  else itemRefs.current.delete(p.id)
                }}
                tabIndex={-1}
                role="checkbox"
                aria-checked={p.done}
                onKeyDown={(e) => handleItemKey(e, p, idx)}
                onClick={() => {
                  if (!isEditing) onToggle(p.id)
                }}
                onDoubleClick={(e) => {
                  e.preventDefault()
                  setEditingId(p.id)
                }}
                onFocus={() => setFocusedId(p.id)}
                className={`group flex items-center gap-3 px-3 py-2 -mx-3 rounded-md cursor-pointer select-none transition-colors ${
                  isFocused ? 'bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                }`}
              >
                <span
                  aria-hidden
                  className={`shrink-0 w-3 h-3 rounded-full border transition-colors ${
                    p.done
                      ? 'bg-neutral-400 border-neutral-400 dark:bg-neutral-500 dark:border-neutral-500'
                      : 'border-neutral-300 dark:border-neutral-700 group-hover:border-neutral-400 dark:group-hover:border-neutral-500'
                  }`}
                />
                {p.rolledOverFrom && !p.done && (
                  <span
                    className="shrink-0 -ml-1.5 text-[9px] leading-none text-neutral-300 dark:text-neutral-700"
                    title={`Carried over from ${p.rolledOverFrom}`}
                    aria-label={`Carried over from ${p.rolledOverFrom}`}
                  >
                    ↻
                  </span>
                )}
                <div
                  className={`flex-1 min-w-0 text-[15px] transition-all duration-150 ${
                    p.done ? 'line-through text-neutral-400 dark:text-neutral-600' : 'text-neutral-900 dark:text-neutral-100'
                  }`}
                  onClick={(e) => {
                    if (isEditing) e.stopPropagation()
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setEditingId(p.id)
                  }}
                >
                  <EditableText
                    value={p.text}
                    editing={isEditing}
                    onCommit={(next) => {
                      setEditingId(null)
                      if (next === '') onDelete(p.id)
                      else if (next !== p.text) onEdit(p.id, next)
                      focusItem(p.id)
                    }}
                    onCancel={() => {
                      setEditingId(null)
                      focusItem(p.id)
                    }}
                  />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
})

function ColumnHeader({ label }: { label: string }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500 mb-3">
      {label}
    </h2>
  )
}
