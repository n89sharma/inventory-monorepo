import { SearchSelectOptionFilter } from '@/components/shared/search-select/search-select-option-filter'
import { ANY_OPTION, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { Table } from '@tanstack/react-table'

/**
 * Table-toolbar filter bound to a string column's faceted values: options are the
 * distinct values present in the loaded rows, selection drives the column's exact-match
 * filter. Mount via {@link DataTable}'s `renderTableFilter`. The column needs
 * `filterFn: 'equals'`.
 */
export function ColumnFacetFilter<TData>({
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
  const options = ([...column.getFacetedUniqueValues().keys()] as string[]).sort()
  const selected = (column.getFilterValue() as string | undefined) ?? null
  return (
    <SearchSelectOptionFilter
      selection={selected ? getSelectOption(selected) : ANY_OPTION}
      onChange={(next) => column.setFilterValue(getSelectedOrNull(next) ?? undefined)}
      options={options}
      getLabel={(value) => value}
      placeholder={placeholder}
      clearLabel={clearLabel}
      className={className}
    />
  )
}
