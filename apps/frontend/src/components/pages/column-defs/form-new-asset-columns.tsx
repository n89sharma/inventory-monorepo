import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { formatThousandsK } from "@/lib/formatters"
import type { AssetForm } from "@/ui-types/arrival-form-types"
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { CoreFunction } from 'shared-types'

interface GetNewAssetTableColumnProps {
  onDelete: (index: number) => void
  onEdit: (index: number) => void
}
export function getNewAssetTableColumns({ onDelete, onEdit }: GetNewAssetTableColumnProps): ColumnDef<AssetForm>[] {
  return [
    {
      accessorKey: "model.brand_name",
      header: "Brand",
      size: 80
    },
    {
      accessorKey: "model.model_name",
      header: "Model",
      size: 120
    },
    {
      accessorKey: "serialNumber",
      header: "Serial Number",
      size: 100
    },
    {
      accessorKey: "meterBlack",
      header: "Meter Black",
      cell: ({ row }) => formatThousandsK(row.getValue('meterBlack')),
      size: 70
    },
    {
      accessorKey: "meterColour",
      header: "Meter Colour",
      cell: ({ row }) => formatThousandsK(row.getValue('meterColour')),
      size: 70
    },
    {
      accessorKey: "internalFinisher",
      header: "Internal Finisher",
      size: 70
    },
    {
      accessorKey: "cassettes",
      header: "Cassettes",
      size: 70
    },
    {
      accessorKey: "technicalStatus.selected.status",
      header: "Technical Status",
      size: 100
    },
    {
      accessorKey: "coreFunctions",
      header: "Core Functions",
      cell: ({ row }) => {
        const functions: CoreFunction[] = row.original.coreFunctions
        return (
          <div className="flex flex-wrap gap-1 max-w-60">
            {functions.map(f => (<Badge key={f.accessory} variant="outline">{f.accessory}</Badge>))}
          </div>
        )
      },
      size: 140
    },
    {
      header: "Edit",
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
      size: 50
    },
    {
      header: "Remove",
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
      size: 50
    }
  ]
}