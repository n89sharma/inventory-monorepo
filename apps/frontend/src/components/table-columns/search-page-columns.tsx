import type { ColumnDef } from '@tanstack/react-table'
import type { AssetSearchRow, Permission } from 'shared-types'
import {
  ASSET_SEARCH_COLUMNS,
  canViewColumn,
  type AssetCellContext,
  type AssetSearchColumn,
} from './asset-search-columns'
import { sortableHeader } from './column-primitives'

function toColumnDef(
  column: AssetSearchColumn,
  context: AssetCellContext,
): ColumnDef<AssetSearchRow> {
  return {
    id: column.id,
    ...(column.accessor ? { accessorFn: column.accessor } : { accessorKey: column.id }),
    header: column.sortable ? sortableHeader<AssetSearchRow>(column.label) : column.label,
    size: column.size,
    sortUndefined: column.sortUndefined,
    enableHiding: !column.alwaysVisible,
    cell: ({ row }) =>
      column.cell ? column.cell(row.original, context) : column.text(row.original),
  }
}

export function createSearchPageColumns(
  detailHref: (row: AssetSearchRow) => string,
  can: (permission: Permission) => boolean,
): ColumnDef<AssetSearchRow>[] {
  const context = { detailHref }
  return ASSET_SEARCH_COLUMNS.filter((column) => canViewColumn(column, can)).map((column) =>
    toColumnDef(column, context),
  )
}
