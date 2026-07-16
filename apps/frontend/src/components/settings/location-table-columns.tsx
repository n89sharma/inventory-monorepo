import { Button } from '@/components/shadcn/button'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { LocationSummary } from 'shared-types'

export const locationTableColumns: ColumnDef<LocationSummary>[] = [
  {
    accessorKey: 'warehouse_code',
    size: 160,
    filterFn: 'includesString',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Warehouse Code <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    accessorKey: 'warehouse_street',
    size: 240,
    filterFn: 'includesString',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Warehouse Street <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    accessorKey: 'zone',
    size: 160,
    filterFn: 'includesString',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Zone <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    accessorKey: 'bin',
    size: 160,
    filterFn: 'includesString',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Bin <ArrowsDownUpIcon />
      </Button>
    ),
  },
]
