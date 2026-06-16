import { StatusBadge } from "@/components/custom/status-badge"
import { ReadinessIcon } from "@/components/custom/readiness-icon"
import { Button } from "@/components/shadcn/button"
import { formatLocation, formatThousandsK, formatTitleCase } from "@/lib/formatters"
import { TrashIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { AssetSummary } from 'shared-types'

export function getFormAssetColumns(onDelete: (index: number) => void): ColumnDef<AssetSummary>[] {
  return [
    {
      accessorKey: "barcode",
      header: "Barcode",
      size: 160
    },
    {
      accessorKey: "brand",
      header: "Brand",
      cell: ({ row }) => formatTitleCase(row.original.brand),
      size: 80
    },
    {
      accessorKey: "model",
      header: "Model",
      size: 110
    },
    {
      accessorKey: "serial_number",
      header: "Serial Number",
      size: 100
    },
    {
      accessorKey: "meter_total",
      header: "Total Meter",
      cell: ({ row }) => formatThousandsK(row.getValue('meter_total')),
      size: 60
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 80
    },
    {
      accessorKey: "readiness",
      header: "Readiness",
      cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
      size: 80
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => formatLocation(row.original.location),
      size: 140
    },
    {
      id: "delete",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="icon"
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
