import { Checkbox } from '@/components/shadcn/checkbox'
import { sortableHeader } from '@/components/table-columns/shared-columns'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModelSummary } from 'shared-types'

export const modelTableColumns: ColumnDef<ModelSummary>[] = [
  {
    accessorKey: 'brand_name',
    filterFn: 'includesString',
    header: sortableHeader<ModelSummary>('Brand'),
  },
  {
    accessorKey: 'model_name',
    filterFn: 'includesString',
    header: sortableHeader<ModelSummary>('Name'),
  },
  {
    id: 'asset_type',
    accessorFn: (model) => formatTitleCase(model.asset_type),
    filterFn: 'equals',
    header: sortableHeader<ModelSummary>('Type'),
  },
  {
    accessorKey: 'weight',
    header: sortableHeader<ModelSummary>('Weight'),
  },
  {
    accessorKey: 'size',
    header: sortableHeader<ModelSummary>('Size'),
  },
  {
    accessorKey: 'is_colour',
    header: 'Colour',
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox checked={row.original.is_colour} />
      </div>
    ),
  },
]
