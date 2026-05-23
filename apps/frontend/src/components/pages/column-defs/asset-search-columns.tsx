import { CopyButton } from "@/components/custom/copy-button"
import { ReadinessIcon } from "@/components/custom/readiness-icon"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { formatLocation, formatThousandsK } from "@/lib/formatters"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { AssetSearchRow } from 'shared-types'

function SortableHeader({
  label,
  onToggle,
}: {
  label: string
  onToggle: () => void
}) {
  return (
    <Button
      variant="ghost"
      onClick={onToggle}
      className="h-auto whitespace-normal py-1"
    >
      {label}
      <ArrowsDownUpIcon />
    </Button>
  )
}

export const assetSearchColumns: ColumnDef<AssetSearchRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    size: 30,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "barcode",
    header: "Barcode",
    cell: ({ row }) => (
      <div className="group flex items-center justify-center gap-1">
        <Link
          to={`/search/${row.original.barcode}`}
          className="text-primary hover:underline font-medium"
        >
          {row.getValue('barcode')}
        </Link>
        <CopyButton value={row.original.barcode} />
      </div>
    ),
    size: 140
  },
  {
    accessorKey: "brand",
    header: "Brand",
    size: 100
  },
  {
    accessorKey: "model",
    header: "Model",
    size: 100
  },
  {
    accessorKey: "serial_number",
    header: "Serial Number",
    size: 100
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    size: 100
  },
  {
    accessorKey: "readiness",
    header: ({ column }) => (
      <SortableHeader
        label="Readiness"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => <ReadinessIcon status={row.original.readiness} />,
    size: 80
  },
  {
    accessorKey: "meter_total",
    header: ({ column }) => (
      <SortableHeader
        label="Total Meter"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => formatThousandsK(row.getValue('meter_total')),
    size: 80
  },
  {
    accessorKey: "cassettes",
    header: ({ column }) => (
      <SortableHeader
        label="Cassettes"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => row.original.cassettes ?? '',
    size: 80
  },
  {
    accessorKey: "internal_finisher",
    header: ({ column }) => (
      <SortableHeader
        label="Internal Finisher"
        onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
      />
    ),
    cell: ({ row }) => row.original.internal_finisher ?? '',
    size: 80
  },
  {
    id: "location",
    header: "Location",
    cell: ({ row }) => formatLocation(row.original.location)
  }
]
