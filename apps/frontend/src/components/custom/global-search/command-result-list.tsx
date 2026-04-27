type CommandResultListProps<T> = {
  items: T[]
  getKey: (item: T) => string
  getValue: (item: T) => string
  getColumns: (item: T) => string[]
  onSelect: (item: T) => void
  onHover?: (value: string) => void
}

export function CommandResultList<T>({ items, getKey, getValue, getColumns, onSelect, onHover }: CommandResultListProps<T>) {
  return (
    <div>
      {items.map(item => {
        const [identifier, ...rest] = getColumns(item)
        return (
          <button
            key={getKey(item)}
            type="button"
            className="flex w-full text-left p-1 gap-4 items-center cursor-pointer rounded-sm hover:bg-accent/50"
            onClick={() => onSelect(item)}
            onMouseDown={e => e.preventDefault()}
            onMouseEnter={() => onHover?.(getValue(item))}
          >
            <span className="text-sm shrink-0 font-mono">{identifier}</span>
            {rest.map((col, i) => (
              <span key={i} className="text-muted-foreground text-xs shrink-0">{col}</span>
            ))}
          </button>
        )
      })}
    </div>
  )
}
