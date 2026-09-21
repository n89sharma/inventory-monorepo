import { AssetPriceCell } from '@/components/shared/asset-price-cell'
import {
  editablePriceFieldForColumn,
  type EditablePriceColumnId,
  type PriceCellEditorRegistry,
} from '@/lib/price-cell-navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { AssetSearchRow, Permission } from 'shared-types'
import {
  ASSET_SEARCH_COLUMNS,
  canViewColumn,
  type AssetCellContext,
  type AssetSearchColumn,
  type AssetWarningOf,
} from './asset-search-columns'

const EDITABLE_COST_COLUMN_SIZE = 110

function editableColumnId(column: AssetSearchColumn): EditablePriceColumnId | undefined {
  if (!editablePriceFieldForColumn(column.id)) return undefined
  return column.id as EditablePriceColumnId
}

function toPriceColumnDef(
  column: AssetSearchColumn,
  columnId: EditablePriceColumnId,
  editorRegistry: PriceCellEditorRegistry,
): ColumnDef<AssetSearchRow> {
  return {
    id: column.id,
    accessorKey: column.id,
    header: column.label,
    size: EDITABLE_COST_COLUMN_SIZE,
    meta: { cellClassName: 'py-0' },
    cell: ({ row, table }) => (
      <AssetPriceCell
        row={row}
        columnId={columnId}
        label={column.label}
        table={table}
        editorRegistry={editorRegistry}
      />
    ),
  }
}

function toColumnDef(
  column: AssetSearchColumn,
  context: AssetCellContext,
): ColumnDef<AssetSearchRow> {
  const editorRegistry = context.priceEditorRegistry
  const columnId = editorRegistry ? editableColumnId(column) : undefined
  if (editorRegistry && columnId) return toPriceColumnDef(column, columnId, editorRegistry)
  return {
    id: column.id,
    ...(column.accessor ? { accessorFn: column.accessor } : { accessorKey: column.id }),
    header: column.label,
    size: column.size,
    sortUndefined: column.sortUndefined,
    cell: ({ row }) =>
      column.cell ? column.cell(row.original, context) : column.text(row.original),
  }
}

export function createSearchPageColumns(
  detailHref: (row: AssetSearchRow) => string,
  can: (permission: Permission) => boolean,
  priceEditorRegistry?: PriceCellEditorRegistry,
  assetWarningOf?: AssetWarningOf,
): ColumnDef<AssetSearchRow>[] {
  const context = { detailHref, priceEditorRegistry, assetWarningOf }
  return ASSET_SEARCH_COLUMNS.filter((column) => canViewColumn(column, can)).map((column) =>
    toColumnDef(column, context),
  )
}
