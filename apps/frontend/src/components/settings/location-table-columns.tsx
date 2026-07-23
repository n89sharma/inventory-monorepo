import { sortableHeader } from '@/components/table-columns/column-primitives'
import type { ColumnDef } from '@tanstack/react-table'
import type { LocationSummary } from 'shared-types'

export const locationTableColumns: ColumnDef<LocationSummary>[] = [
  {
    accessorKey: 'warehouse_code',
    size: 160,
    filterFn: 'includesString',
    header: sortableHeader<LocationSummary>('Warehouse Code'),
  },
  {
    accessorKey: 'warehouse_street',
    filterFn: 'includesString',
    header: sortableHeader<LocationSummary>('Warehouse Street'),
  },
  {
    accessorKey: 'zone',
    filterFn: 'includesString',
    header: sortableHeader<LocationSummary>('Zone'),
  },
  {
    accessorKey: 'bin',
    filterFn: 'includesString',
    header: sortableHeader<LocationSummary>('Bin'),
  },
]
