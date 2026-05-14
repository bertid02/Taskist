import { useState, type DragEvent } from 'react'

export type DropTarget = { id: string; before: boolean } | null

type Item = { id: string }

/**
 * Lightweight HTML5 drag-and-drop sorting for a list of items. Computes a
 * drop position (before/after) based on the cursor's vertical position over
 * the target row and calls onMove on drop.
 */
export function useDragSort<T extends Item>(
  onMove: (draggedId: string, targetId: string, before: boolean) => void,
) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget>(null)

  function onDragStart(e: DragEvent<HTMLElement>, item: T) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
    setDragId(item.id)
  }

  function onDragOver(e: DragEvent<HTMLElement>, item: T) {
    if (!dragId || dragId === item.id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const before = e.clientY < rect.top + rect.height / 2
    if (dropTarget?.id !== item.id || dropTarget.before !== before) {
      setDropTarget({ id: item.id, before })
    }
  }

  function onDrop(e: DragEvent<HTMLElement>, item: T) {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== item.id) {
      onMove(draggedId, item.id, dropTarget?.before ?? true)
    }
    setDragId(null)
    setDropTarget(null)
  }

  function onDragEnd() {
    setDragId(null)
    setDropTarget(null)
  }

  return { dragId, dropTarget, onDragStart, onDragOver, onDrop, onDragEnd }
}

export function dropShadow(isTarget: boolean, before: boolean | undefined): string | undefined {
  if (!isTarget) return undefined
  return before
    ? 'inset 0 2px 0 0 rgb(115 115 115 / 0.8)'
    : 'inset 0 -2px 0 0 rgb(115 115 115 / 0.8)'
}
