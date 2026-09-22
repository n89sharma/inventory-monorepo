import { ColumnPickerButton } from '@/components/shared/column-picker-button'
import { TableResultCount, TableToolbarEnd } from '@/components/shared/table-toolbar'
import type { Table } from '@tanstack/react-table'
import type { AssetSearchRow } from 'shared-types'

export function AssetResultsToolbar({
  table,
  visibleColumns,
  onVisibleColumnsChange,
  onResetColumns,
}: {
  table: Table<AssetSearchRow>
  visibleColumns: Set<string>
  onVisibleColumnsChange: (next: Set<string>) => void
  onResetColumns: () => void
}): React.JSX.Element {
  return (
    <TableToolbarEnd>
      <TableResultCount table={table} />
      <ColumnPickerButton
        visible={visibleColumns}
        onVisibleChange={onVisibleColumnsChange}
        onReset={onResetColumns}
      />
    </TableToolbarEnd>
  )
}
