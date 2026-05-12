import { formatHistoryTimestamp } from '@/lib/formatters';

export function formatHistoryValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return (value as string[]).join(', ')
  return String(value)
}

export function EntryHeader(
  { userName, timestamp, verb }: { userName: string; timestamp: Date | string; verb: string }
) {
  return (
    <p className="text-sm">{userName} {verb} {formatHistoryTimestamp(timestamp)}</p>
  )
}

export function FieldChip({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="text-sm font-mono bg-muted/50 rounded px-2 py-0.5">
      <span className="text-muted-foreground">{`${label} `}</span>
      <span className="font-medium">{formatHistoryValue(value)}</span>
    </div>
  )
}

export function FieldDiffRow(
  { label, before, after }: { label: string; before: unknown; after: unknown }
) {
  const beforeStr = formatHistoryValue(before)
  const afterStr = formatHistoryValue(after)
  const hasBefore = beforeStr !== ''
  const hasAfter = afterStr !== ''

  let content: React.ReactNode
  if (!hasBefore && hasAfter) {
    content = (
      <>
        <span className="text-muted-foreground">{`Added ${label} `}</span>
        <span className="font-medium">{afterStr}</span>
      </>
    )
  } else if (hasBefore && !hasAfter) {
    content = (
      <>
        <span className="text-muted-foreground">{`Removed ${label} `}</span>
        <span className="font-medium">{beforeStr}</span>
      </>
    )
  } else {
    content = (
      <>
        <span className="text-muted-foreground">{`${label} `}</span>
        <span className="font-medium">{`${beforeStr} → ${afterStr}`}</span>
      </>
    )
  }

  return (
    <div className="text-sm font-mono bg-muted/50 rounded px-2 py-0.5">
      {content}
    </div>
  )
}

export function HistoryTimeline<T>(
  { items, renderEntry, emptyMessage = 'No history on record' }: {
    items: T[]
    renderEntry: (item: T, index: number) => React.ReactNode
    emptyMessage?: string
  }
) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }
  return (
    <ol className="flex flex-col gap-6 ml-4">
      {items.map((item, i) => (
        <li key={i} className="relative pl-6">
          <span className="absolute left-0 top-1 h-3 w-3 rounded-full bg-muted ring-4 ring-card border border-border" />
          {i < items.length - 1 && (
            <span className="absolute left-1.5 top-4 bottom-[-1.5rem] w-px bg-border" />
          )}
          {renderEntry(item, i)}
        </li>
      ))}
    </ol>
  )
}
