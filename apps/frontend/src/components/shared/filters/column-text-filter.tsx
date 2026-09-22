import { FilterTextInput } from '@/components/shared/filters/filter-text-input'
import type { Table } from '@tanstack/react-table'

/**
 * Table-toolbar free-text filter for a high-cardinality column (serial number, barcode):
 * typing narrows rows whose value contains the query. Mount via {@link DataTable}'s
 * `renderToolbar`. The column needs `filterFn: 'includesString'`.
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
    <FilterTextInput
      value={value}
      onValueChange={(newValue) => column.setFilterValue(newValue || undefined)}
      placeholder={placeholder}
      clearLabel={clearLabel}
      className={className}
    />
  )
}
