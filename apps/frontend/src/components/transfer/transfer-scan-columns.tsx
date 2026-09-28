import {
  ID_COLUMN_SIZE,
  IdLink,
  MODEL_COLUMN_SIZE,
  SERIAL_NUMBER_COLUMN_SIZE,
} from '@/components/table-columns/column-primitives'
import { assetDetailHref } from '@/ui-types/navigation-context'
import type { ColumnDef } from '@tanstack/react-table'
import type { TransferAssetRow } from 'shared-types'

export function transferScanTableColumns(): ColumnDef<TransferAssetRow>[] {
  return [
    {
      accessorKey: 'barcode',
      header: 'Barcode',
      size: ID_COLUMN_SIZE,
      cell: ({ row }) => (
        <IdLink to={assetDetailHref(row.original.barcode)}>{row.original.barcode}</IdLink>
      ),
    },
    { accessorKey: 'serial_number', header: 'Serial Number', size: SERIAL_NUMBER_COLUMN_SIZE },
    { accessorKey: 'model', header: 'Model', size: MODEL_COLUMN_SIZE },
  ]
}
