import { FilterTextInput } from '@/components/shared/filters/filter-text-input'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { Table } from '@tanstack/react-table'

/**
 * Table-toolbar free-text filter that keeps a row when any searchable column contains the
 * query. Mount via {@link DataTable}'s `renderTableFilter`; the table needs a `textSearch`
 * predicate naming the columns that take part.
 */
export function TableTextFilter<TData>({
  table,
  placeholder,
  clearLabel,
  className,
}: {
  table: Table<TData>
  placeholder: string
  clearLabel: string
  className?: string
}): React.JSX.Element {
  const value = (table.getState().globalFilter as string | undefined) ?? ''
  return (
    <FilterTextInput
      value={value}
      onValueChange={(newValue) => table.setGlobalFilter(newValue)}
      leadingIcon={<MagnifyingGlassIcon className="size-4" />}
      placeholder={placeholder}
      clearLabel={clearLabel}
      className={className}
    />
  )
}
