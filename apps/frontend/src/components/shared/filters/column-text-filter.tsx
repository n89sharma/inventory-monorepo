import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { XIcon } from '@phosphor-icons/react'
import type { Table } from '@tanstack/react-table'

/**
 * Table-toolbar free-text filter for a high-cardinality column (serial number, barcode):
 * typing narrows rows whose value contains the query. Mount via {@link DataTable}'s
 * `renderTableFilter`. The column needs `filterFn: 'includesString'`.
 */
export function ColumnTextFilter<TData>({
  table,
  columnId,
  placeholder,
  clearLabel,
  className,
}: {
  table: Table<TData>
  columnId: string
  placeholder: string
  clearLabel: string
  className?: string
}): React.JSX.Element | null {
  const column = table.getColumn(columnId)
  if (!column) return null
  const value = (column.getFilterValue() as string | undefined) ?? ''
  return (
    <div className={`relative ${className ?? ''}`.trim()}>
      <Input
        value={value}
        onChange={(event) => column.setFilterValue(event.target.value || undefined)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="bg-background pr-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={clearLabel}
          onClick={() => column.setFilterValue(undefined)}
          className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
