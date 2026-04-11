import { AvailabilityStatusBadge } from "@/components/custom/availability-status-badge"
import { TechnicalStatusIcon } from "@/components/custom/technical-status-icon"
import { TrackingStatusBadge } from "@/components/custom/tracking-status-badge"
import { CopyButton } from "@/components/custom/copy-button"
import { Button } from "@/components/shadcn/button"
import { formatThousandsK } from "@/lib/formatters"
import { isCollection, type NavigationSection } from '@/ui-types/navigation-context'
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { AssetSummary } from 'shared-types'

export function createAssetSummaryColumns(
  navigationSection: NavigationSection,
  collectionId?: string): ColumnDef<AssetSummary>[] {

  return [
    {
      accessorKey: "barcode",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Barcode
            <ArrowsDownUpIcon />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="group flex items-center justify-center gap-2">
          <Link
            to={
              isCollection(navigationSection)
                ? `/${navigationSection}/${collectionId}/${row.original.barcode}`
                : `/search/${row.original.barcode}`
            }
            className="text-primary hover:underline font-medium"
          >
            {row.getValue('barcode')}
          </Link>
          <CopyButton value={row.original.barcode} />
        </div>
      ),
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
      size: 120
    },
    {
      accessorKey: "serial_number",
      header: "Serial Number",
      size: 100
    },
    {
      accessorKey: "meter_total",
      cell: ({ row }) => {
        return formatThousandsK(row.getValue('meter_total'))
      },
      header: "Total Meter",
      size: 70
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
      size: 80
    }
  ]
}
