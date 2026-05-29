import { forwardRef, useRef, useState, type KeyboardEvent } from 'react'
import type { Priority, Tier } from '../types'
import { EditableText } from './EditableText'
import { HistoryIcon, PencilIcon, PlusIcon, TierMoveIcon, XIcon } from './icons'
import { dropShadow, useDragSort } from '../lib/useDragSort'
import { displayDate } from '../lib/date'

type Props = {
  priorities: Priority[]
  onAdd: (text: string, tier: Tier) => void
  onToggle: (id: string) => void
  onEdit: (id: string, text: string) => void
  onSetTier: (id: string, tier: Tier) => void
  onDelete: (id: string) => void
  onReorder: (id: string, dir: -1 | 1) => void
  onMove: (draggedId: string, targetId: string, before: boolean) => void
}

const inputClass =
  'w-full rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 ' +
  'pl-8 pr-3 py-2.5 text-[15px] placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none ' +
  'focus:bg-white dark:focus:bg-neutral-900 focus:border-neutral-300 dark:focus:border-neutral-700 ' +
  'focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700 transition-colors'

export const PriorityColumn = forwardRef<HTMLInputElement, Props>(function PriorityColumn(
  { priorities, onAdd, onToggle, onEdit, onSetTier, onDelete, onReorder, onMove },
  inputRef,
) {
  const [todayDraft, setTodayDraft] = useState('')
  const [laterDraft, setLaterDraft] = useState('')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const laterInputRef = useRef<HTMLInputElement>(null)
  // The hook only reads `.id`, so a loose item type lets real priorities and the
  // empty-section sentinels (`__empty_today` / `__empty_later`) share one instance.
  const drag = useDragSort<{ id: string }>(onMove)

  const today = priorities.filter((p) => p.tier === 'today')
  const later = priorities.filter((p) => p.tier === 'later')

  const focusItem = (id: string) => {
    setFocusedId(id)
    requestAnimationFrame(() => itemRefs.current.get(id)?.focus())
  }

  const focusInput = (tier: Tier) => {
    setFocusedId(null)
    requestAnimationFrame(() => {
      const ref = tier === 'today' ? (inputRef as React.RefObject<HTMLInputElement>) : laterInputRef
      ref?.current?.focus()
    })
  }

  const handleInputKey = (e: KeyboardEvent<HTMLInputElement>, tier: Tier) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const draft = tier === 'today' ? todayDraft : laterDraft
      const t = draft.trim()
      if (t) {
        onAdd(t, tier)
        ;(tier === 'today' ? setTodayDraft : setLaterDraft)('')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const items = tier === 'today' ? today : later
      if (items.length > 0) focusItem(items[0].id)
      else if (tier === 'today') focusInput('later')
    } else if (e.key === 'ArrowUp' && tier === 'later') {
      e.preventDefault()
      if (today.length > 0) focusItem(today[today.length - 1].id)
      else focusInput('today')
    }
  }

  const handleItemKey = (e: KeyboardEvent<HTMLDivElement>, p: Priority, tier: Tier, i: number) => {
    if (editingId === p.id) return
    const items = tier === 'today' ? today : later
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (e.altKey) {
        if (i < items.length - 1) onReorder(p.id, 1)
      } else if (i < items.length - 1) {
        focusItem(items[i + 1].id)
      } else if (tier === 'today') {
        focusInput('later')
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (e.altKey) {
        if (i > 0) onReorder(p.id, -1)
      } else if (i > 0) {
        focusItem(items[i - 1].id)
      } else {
        focusInput(tier)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      focusInput(tier)
    } else if (e.key === ' ') {
      e.preventDefault()
      onToggle(p.id)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      setEditingId(p.id)
    } else if (e.key.toLowerCase() === 'm') {
      e.preventDefault()
      onSetTier(p.id, p.tier === 'today' ? 'later' : 'today')
      focusItem(p.id)
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
      e.preventDefault()
      const next = items[i + 1] ?? items[i - 1]
      onDelete(p.id)
      if (next) focusItem(next.id)
      else focusInput(tier)
    }
  }

  const renderInput = (tier: Tier) => {
    const isToday = tier === 'today'
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
          <PlusIcon />
        </span>
        <input
          ref={isToday ? inputRef : laterInputRef}
          value={isToday ? todayDraft : laterDraft}
          onChange={(e) => (isToday ? setTodayDraft : setLaterDraft)(e.target.value)}
          onKeyDown={(e) => handleInputKey(e, tier)}
          placeholder={isToday ? 'Add a must-do for today…' : 'Something for later…'}
          className={inputClass}
          aria-label={isToday ? 'Add a priority for today' : 'Add a priority for later'}
        />
      </div>
    )
  }

  const renderRow = (p: Priority, tier: Tier, i: number) => {
    const isFocused = focusedId === p.id
    const isEditing = editingId === p.id
    const isDragging = drag.dragId === p.id
    const isDropTarget = drag.dropTarget?.id === p.id
    const moveLabel = p.tier === 'today' ? 'Move to Anytime' : 'Move to Today'
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
          draggable={!isEditing}
          onDragStart={(e) => drag.onDragStart(e, p)}
          onDragOver={(e) => drag.onDragOver(e, p)}
          onDrop={(e) => drag.onDrop(e, p)}
          onDragEnd={drag.onDragEnd}
          onKeyDown={(e) => handleItemKey(e, p, tier, i)}
          onClick={() => {
            if (!isEditing) onToggle(p.id)
          }}
          onDoubleClick={(e) => {
            e.preventDefault()
            setEditingId(p.id)
          }}
          onFocus={() => setFocusedId(p.id)}
          style={{
            boxShadow: dropShadow(isDropTarget, drag.dropTarget?.before),
          }}
          className={`group flex items-center gap-3 px-3 py-2 -mx-3 rounded-md cursor-grab active:cursor-grabbing select-none transition-colors ${
            isFocused ? 'bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
          } ${isDragging ? 'opacity-40' : ''}`}
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
              className="shrink-0 -ml-1.5 leading-none text-neutral-400 dark:text-neutral-600"
              title={`Carried over from ${displayDate(p.rolledOverFrom)}`}
              aria-label={`Carried over from ${displayDate(p.rolledOverFrom)}`}
            >
              <HistoryIcon />
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
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <RowButton
                label={moveLabel}
                onClick={() => onSetTier(p.id, p.tier === 'today' ? 'later' : 'today')}
              >
                <TierMoveIcon up={p.tier === 'later'} />
              </RowButton>
              <RowButton label="Edit" onClick={() => setEditingId(p.id)}>
                <PencilIcon />
              </RowButton>
              <RowButton label="Delete" onClick={() => onDelete(p.id)}>
                <XIcon />
              </RowButton>
            </div>
          )}
        </div>
      </li>
    )
  }

  const renderSection = (tier: Tier, label: string) => {
    const items = tier === 'today' ? today : later
    const remaining = items.filter((p) => !p.done).length
    const count =
      items.length === 0
        ? null
        : tier === 'today'
          ? remaining === 0
            ? 'all done'
            : `${remaining} left`
          : `${items.length}`
    return (
      <div className={tier === 'later' ? 'mt-7 pt-6 border-t border-neutral-100 dark:border-neutral-900' : ''}>
        <SectionHeader label={label} count={count} />
        {renderInput(tier)}
        <ul className="mt-1">
          {items.map((p, i) => renderRow(p, tier, i))}
          {items.length === 0 && (
            <li>
              <div
                onDragOver={(e) => drag.onDragOver(e, { id: `__empty_${tier}` })}
                onDrop={(e) => drag.onDrop(e, { id: `__empty_${tier}` })}
                className={`mt-1 rounded-md border border-dashed px-3 py-3 text-[13px] text-center transition-colors ${
                  drag.dropTarget?.id === `__empty_${tier}`
                    ? 'border-neutral-400 dark:border-neutral-500 text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/50'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-300 dark:text-neutral-600'
                }`}
              >
                Nothing here — drag a task in, or press M
              </div>
            </li>
          )}
        </ul>
      </div>
    )
  }

  return (
    <section className="flex flex-col min-w-0">
      {renderSection('today', 'Today')}
      {renderSection('later', 'Anytime')}
    </section>
  )
})

function RowButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      draggable={false}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
      aria-label={label}
      className="grid place-items-center w-6 h-6 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 dark:text-neutral-500 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
    >
      {children}
    </button>
  )
}

function SectionHeader({ label, count }: { label: string; count?: string | null }) {
  return (
    <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400 mb-3">
      {label}
      {count && (
        <span className="ml-2 text-neutral-300 dark:text-neutral-600 normal-case tracking-normal font-normal">
          · {count}
        </span>
      )}
    </h2>
  )
}
