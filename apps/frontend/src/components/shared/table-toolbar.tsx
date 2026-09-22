import type { Table } from '@tanstack/react-table'

const TOOLBAR_CLASS = 'flex shrink-0 items-center gap-4 border-b bg-muted px-2 py-1'
const TOOLBAR_END_CLASS = 'ml-auto flex items-center gap-4'
const RESULT_COUNT_CLASS = 'shrink-0 text-xs text-muted-foreground'

export function TableToolbar({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className={TOOLBAR_CLASS}>{children}</div>
}

export function TableToolbarEnd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className={TOOLBAR_END_CLASS}>{children}</div>
}

// Only the table knows the total once a column filter or the text search has run.
export function TableResultCount<TData>({ table }: { table: Table<TData> }): React.JSX.Element {
  const count = table.getFilteredRowModel().rows.length
  return (
    <span className={RESULT_COUNT_CLASS}>
      {count.toLocaleString()} {count === 1 ? 'result' : 'results'}
    </span>
  )
}
