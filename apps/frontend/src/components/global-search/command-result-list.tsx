import { cn } from '@/lib/utils'
import { resultOptionId } from './search-results'

type CommandResultListProps<T> = {
  items: T[]
  listboxId: string
  highlightedIndex: number
  getKey: (item: T) => string
  getColumns: (item: T) => string[]
  onSelect: (item: T) => void
  onHover?: (item: T) => void
}

export function CommandResultList<T>({
  items,
  listboxId,
  highlightedIndex,
  getKey,
  getColumns,
  onSelect,
  onHover,
}: CommandResultListProps<T>) {
  return (
    <div id={listboxId} role="listbox">
      {items.map((item, index) => {
        const [identifier, ...rest] = getColumns(item)
        const highlighted = index === highlightedIndex
        return (
          <button
            key={getKey(item)}
            id={resultOptionId(listboxId, index)}
            role="option"
            aria-selected={highlighted}
            type="button"
            className={cn(
              'flex w-full text-left p-1 gap-4 items-center cursor-pointer rounded-sm hover:bg-accent/50',
              highlighted && 'bg-accent/50',
            )}
            onClick={() => onSelect(item)}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => onHover?.(item)}
          >
            <span className="text-sm shrink-0 font-mono">{identifier}</span>
            {rest.map((col, i) => (
              <span key={i} className="text-muted-foreground text-xs shrink-0">
                {col}
              </span>
            ))}
          </button>
        )
      })}
    </div>
  )
}
