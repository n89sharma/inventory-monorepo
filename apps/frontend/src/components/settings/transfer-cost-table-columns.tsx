import { createEditColumn } from '@/components/table-columns/column-primitives'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { TransferCosts, Warehouse } from 'shared-types'

export interface WarehouseTransferCostRow extends TransferCosts {
  warehouse: Warehouse
  warehouse_label: string
}

function priceColumn(
  accessorKey: keyof TransferCosts,
  header: string,
): ColumnDef<WarehouseTransferCostRow> {
  return {
    accessorKey,
    header,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatUSDWithSymbol(getValue<number>())}</span>
    ),
  }
}

export function createTransferCostTableColumns(
  onEdit: ((row: WarehouseTransferCostRow) => void) | undefined,
): ColumnDef<WarehouseTransferCostRow>[] {
  return [
    { accessorKey: 'warehouse_label', header: 'Warehouse' },
    priceColumn('transfer_cost', 'Transfer Cost'),
    priceColumn('processing_cost', 'Processing Cost'),
    priceColumn('other_cost', 'Other Cost'),
    ...(onEdit ? [createEditColumn<WarehouseTransferCostRow>(onEdit, 'Edit transfer costs')] : []),
  ]
}
