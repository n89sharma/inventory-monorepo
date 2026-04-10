import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
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
      header: "Brand"
    },
    {
      accessorKey: "model.model_name",
      header: "Model"
    },
    {
      accessorKey: "serialNumber",
      header: "Serial Number"
    },
    {
      accessorKey: "meterBlack",
      header: "Meter Black"
    },
    {
      accessorKey: "meterColour",
      header: "Meter Colour"
    },
    {
      accessorKey: "internalFinisher",
      header: "Internal Finisher"
    },
    {
      accessorKey: "cassettes",
      header: "Cassettes"
    },
    {
      accessorKey: "technicalStatus.selected.status",
      header: "Technical Status"
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
      }
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
      )
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
      )
    }
  ]
}