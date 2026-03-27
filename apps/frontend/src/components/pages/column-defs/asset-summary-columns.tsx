import { Button } from "@/components/shadcn/button"
import { formatThousandsK } from "@/lib/formatters"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { AssetSummary, NavigationSection } from 'shared-types'
import { isCollection } from 'shared-types'

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
      )
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
      cell: ({ row }) => {
        return formatThousandsK(row.getValue('meter_total'))
      },
      header: "Total Meter"
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
    }
  ]
}
