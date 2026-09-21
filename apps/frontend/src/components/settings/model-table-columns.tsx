import { Checkbox } from '@/components/shadcn/checkbox'
import { createEditColumn } from '@/components/table-columns/column-primitives'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { ModelSummary } from 'shared-types'

export function createModelTableColumns(
  onEdit: ((model: ModelSummary) => void) | undefined,
): ColumnDef<ModelSummary>[] {
  return [
    {
      accessorKey: 'brand_name',
      filterFn: 'includesString',
      header: 'Brand',
    },
    {
      accessorKey: 'model_name',
      filterFn: 'includesString',
      header: 'Name',
    },
    {
      id: 'asset_type',
      accessorFn: (model) => formatTitleCase(model.asset_type),
      filterFn: 'equals',
      header: 'Type',
    },
    {
      accessorKey: 'weight',
      header: 'Weight',
    },
    {
      accessorKey: 'size',
      header: 'Size',
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
    ...(onEdit ? [createEditColumn<ModelSummary>(onEdit, 'Edit model')] : []),
  ]
}
