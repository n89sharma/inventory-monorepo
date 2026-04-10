import { Button } from "@/components/shadcn/button"
import { formatThousandsK } from "@/lib/formatters"
import { TrashIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { AssetSummary } from 'shared-types'

export function getFormAssetColumns(onDelete: (index: number) => void): ColumnDef<AssetSummary>[] {
  return [
    {
      accessorKey: "barcode",
      header: "Barcode"
    },
    {
      accessorKey: "brand",
      header: "Brand"
    },
    {
      accessorKey: "model",
      header: "Model"
    },
    {
      accessorKey: "serial_number",
      header: "Serial Number"
    },
    {
      accessorKey: "meter_total",
      header: "Total Meter",
      cell: ({ row }) => formatThousandsK(row.getValue('meter_total'))
    },
    {
      accessorKey: "availability_status",
      header: "Availability Status"
    },
    {
      accessorKey: "tracking_status",
      header: "Tracking Status"
    },
    {
      accessorKey: "technical_status",
      header: "Technical Status"
    },
    {
      accessorKey: "warehouse_city_code",
      header: "Warehouse"
    },
    {
      id: "delete",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
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
