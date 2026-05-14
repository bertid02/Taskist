import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string
  editing: boolean
  onCommit: (next: string) => void
  onCancel: () => void
  className?: string
  /** If true, committing an empty string fires onCommit("") so the parent can delete. */
  allowEmpty?: boolean
}

/**
 * Click-to-edit text. Renders display text when not editing, input when editing.
 * Enter commits, Esc cancels, blur commits.
 */
export function EditableText({ value, editing, onCommit, onCancel, className, allowEmpty }: Props) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [editing, value])

  if (!editing) {
    return <span className={className}>{value}</span>
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const trimmed = draft.trim()
          if (!trimmed && !allowEmpty) onCancel()
          else onCommit(trimmed)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
        e.stopPropagation()
      }}
      onBlur={() => {
        const trimmed = draft.trim()
        if (!trimmed && !allowEmpty) onCancel()
        else if (trimmed !== value) onCommit(trimmed)
        else onCancel()
      }}
      className={`${className ?? ''} bg-transparent outline-none w-full`}
    />
  )
}
