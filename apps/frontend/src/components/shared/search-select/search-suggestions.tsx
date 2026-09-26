import { cn } from '@/lib/utils'

export function SuggestionList<T>({
  matches,
  highlightedIndex,
  getLabel,
  getColumns,
  onSelect,
  empty,
}: {
  matches: T[]
  highlightedIndex: number
  getLabel: (item: T) => string
  getColumns?: (item: T) => string[]
  onSelect: (item: T) => void
  empty?: React.ReactNode
}): React.JSX.Element {
  return (
    <>
      {matches.map((m, i) => (
        <button
          key={`${getLabel(m)}-${i}`}
          type="button"
          role="option"
          aria-selected={highlightedIndex === i}
          onClick={() => onSelect(m)}
          onMouseDown={(e) => {
            e.preventDefault()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect(m)
            }
          }}
          className={cn(
            'block w-full text-left px-2 py-1 cursor-pointer rounded-sm whitespace-nowrap',
            highlightedIndex === i ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
          )}
        >
          {getColumns ? <SuggestionColumns columns={getColumns(m)} /> : getLabel(m)}
        </button>
      ))}
      {matches.length === 0 && empty}
    </>
  )
}

export function NoResults(): React.JSX.Element {
  return <p className="px-2 py-1 text-sm text-muted-foreground">No results found</p>
}

function SuggestionColumns({ columns }: { columns: string[] }): React.JSX.Element {
  const [identifier, ...rest] = columns
  return (
    <span className="flex items-center gap-3">
      <span className="font-mono font-medium">{identifier}</span>
      {rest.map((col, i) => (
        <span key={i} className="text-muted-foreground text-xs">
          {col}
        </span>
      ))}
    </span>
  )
}
