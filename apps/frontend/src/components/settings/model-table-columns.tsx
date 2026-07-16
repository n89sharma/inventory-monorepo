import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { formatTitleCase } from '@/lib/formatters'
import { ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModelSummary } from 'shared-types'

export const modelTableColumns: ColumnDef<ModelSummary>[] = [
  {
    accessorKey: 'brand_name',
    size: 160,
    filterFn: 'includesString',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Brand <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    accessorKey: 'model_name',
    size: 220,
    filterFn: 'includesString',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Name <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    id: 'asset_type',
    accessorFn: (model) => formatTitleCase(model.asset_type),
    size: 140,
    filterFn: 'equals',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Type <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    accessorKey: 'weight',
    size: 100,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Weight <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    accessorKey: 'size',
    size: 100,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Size <ArrowsDownUpIcon />
      </Button>
    ),
  },
  {
    accessorKey: 'is_colour',
    header: 'Colour',
    size: 80,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox checked={row.original.is_colour} />
      </div>
    ),
  },
]
