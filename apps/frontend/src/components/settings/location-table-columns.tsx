import type { ColumnDef } from '@tanstack/react-table'
import type { LocationSummary } from 'shared-types'

export const locationTableColumns: ColumnDef<LocationSummary>[] = [
  {
    accessorKey: 'warehouse_code',
    size: 160,
    filterFn: 'includesString',
    header: 'Warehouse Code',
  },
  {
    accessorKey: 'warehouse_street',
    filterFn: 'includesString',
    header: 'Warehouse Street',
  },
  {
    accessorKey: 'zone',
    filterFn: 'includesString',
    header: 'Zone',
  },
  {
    accessorKey: 'bin',
    filterFn: 'includesString',
    header: 'Bin',
  },
]
