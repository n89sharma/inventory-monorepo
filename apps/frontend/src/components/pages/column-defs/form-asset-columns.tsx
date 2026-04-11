import { AvailabilityStatusBadge } from "@/components/custom/availability-status-badge"
import { TechnicalStatusIcon } from "@/components/custom/technical-status-icon"
import { TrackingStatusBadge } from "@/components/custom/tracking-status-badge"
import { Button } from "@/components/shadcn/button"
import { formatThousandsK } from "@/lib/formatters"
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
      accessorKey: "availability_status",
      header: "Availability Status",
      cell: ({ row }) => <AvailabilityStatusBadge status={row.original.availability_status} />,
      size: 80
    },
    {
      accessorKey: "tracking_status",
      header: "Tracking Status",
      cell: ({ row }) => <TrackingStatusBadge status={row.original.tracking_status} />,
      size: 80
    },
    {
      accessorKey: "technical_status",
      header: "Technical Status",
      cell: ({ row }) => <TechnicalStatusIcon status={row.original.technical_status} />,
      size: 80
    },
    {
      accessorKey: "warehouse_city_code",
      header: "Warehouse",
      size: 60
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
