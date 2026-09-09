import { useState } from 'react'

const NO_HIGHLIGHT = -1

type ListKeyboardNavigation = {
  highlightedIndex: number
  onKeyDown: (event: React.KeyboardEvent) => void
  resetHighlight: () => void
}

// Focus stays on the input; the highlighted option is announced through
// aria-activedescendant, per the WAI-ARIA combobox pattern.
export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  onDismiss,
}: {
  items: T[]
  onSelect: (item: T) => void
  onDismiss: () => void
}): ListKeyboardNavigation {
  const [highlightedIndex, setHighlightedIndex] = useState(NO_HIGHLIGHT)
  const activeIndex = highlightedIndex < items.length ? highlightedIndex : NO_HIGHLIGHT

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex(activeIndex < items.length - 1 ? activeIndex + 1 : activeIndex)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex(activeIndex > NO_HIGHLIGHT ? activeIndex - 1 : NO_HIGHLIGHT)
    } else if (event.key === 'Enter' && activeIndex > NO_HIGHLIGHT) {
      event.preventDefault()
      onSelect(items[activeIndex])
    } else if (event.key === 'Escape') {
      onDismiss()
    }
  }

  function resetHighlight() {
    setHighlightedIndex(NO_HIGHLIGHT)
  }

  return { highlightedIndex: activeIndex, onKeyDown, resetHighlight }
}
