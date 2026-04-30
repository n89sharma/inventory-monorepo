import { CopyButton } from "@/components/custom/copy-button"
import { Button } from "@/components/shadcn/button"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { ArrivalSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, makeEditColumn } from './shared-columns'

export const arrivalTableColumns: ColumnDef<ArrivalSummary>[] = [
  {
    accessorKey: "arrival_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Arrival Number
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="group flex items-center justify-center gap-2">
        <Link to={`/arrivals/${row.original.arrival_number}`} className="text-primary hover:underline font-medium">
          {row.getValue('arrival_number')}
        </Link>
        <CopyButton value={row.original.arrival_number} />
      </div>
    ),
    size: 140
  },
  createdAtColumn as ColumnDef<ArrivalSummary>,
  createdByColumn as ColumnDef<ArrivalSummary>,
  { accessorKey: "destination_code", header: "Warehouse", size: 80 },
  { accessorKey: "transporter", header: "Transporter" },
  { accessorKey: "vendor", header: "Vendor" },
  assetCountColumn as ColumnDef<ArrivalSummary>,
  makeEditColumn<ArrivalSummary>(row => `/arrivals/${row.arrival_number}/edit`),
]
