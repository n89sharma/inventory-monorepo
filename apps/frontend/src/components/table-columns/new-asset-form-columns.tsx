import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { ReadinessPill } from '@/components/shared/readiness/readiness-pill'
import { formatThousandsK, formatTitleCase } from '@/lib/formatters'
import type { AssetForm } from '@/ui-types/arrival-form-types'
import { getSelectedOrNull } from '@/ui-types/select-option-types'
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { CoreFunction } from 'shared-types'

interface GetNewAssetFormColumnsProps {
  onDelete: (index: number) => void
  onEdit: (index: number) => void
}
export function getNewAssetFormColumns({
  onDelete,
  onEdit,
}: GetNewAssetFormColumnsProps): ColumnDef<AssetForm>[] {
  return [
    {
      accessorKey: 'model.brand_name',
      header: 'Brand',
      cell: ({ row }) => formatTitleCase(row.original.model?.brand_name ?? ''),
    },
    {
      accessorKey: 'model.model_name',
      header: 'Model',
    },
    {
      accessorKey: 'serialNumber',
      header: 'Serial Number',
    },
    {
      accessorKey: 'meterBlack',
      header: 'Meter Black',
      cell: ({ row }) => formatThousandsK(row.getValue('meterBlack')),
    },
    {
      accessorKey: 'meterColour',
      header: 'Meter Colour',
      cell: ({ row }) => formatThousandsK(row.getValue('meterColour')),
    },
    {
      id: 'component',
      header: 'Internal Finisher',
      accessorFn: (row) => formatTitleCase(row.component?.name ?? ''),
    },
    {
      accessorKey: 'cassettes',
      header: 'Cassettes',
    },
    {
      accessorKey: 'readiness.selected.status',
      header: 'Readiness',
      cell: ({ row }) => (
        <ReadinessPill status={getSelectedOrNull(row.original.readiness)?.status} />
      ),
    },
    {
      accessorKey: 'coreFunctions',
      header: 'Core Functions',
      cell: ({ row }) => {
        const functions: CoreFunction[] = row.original.coreFunctions
        return (
          <div className="flex flex-wrap gap-1 max-w-60">
            {functions.map((f) => (
              <Badge key={f.accessory} variant="outline">
                {f.accessory}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      header: 'Edit',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Edit asset"
          onClick={() => onEdit(row.index)}
        >
          <PencilSimpleIcon />
        </Button>
      ),
    },
    {
      header: 'Remove',
      cell: ({ row }) => (
        <Button
          variant="outline"
          type="button"
          aria-label="Remove asset"
          onClick={() => onDelete(row.index)}
        >
          <TrashIcon />
        </Button>
      ),
    },
  ]
}
