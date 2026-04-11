import { Button } from "@/components/shadcn/button"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { DepartureSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, makeEditColumn } from './shared-columns'

export const departureTableColumns: ColumnDef<DepartureSummary>[] = [
  {
    accessorKey: "departure_number",
    size: 140,
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Departure Number
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ row }) => (
      <Link to={`/departures/${row.original.departure_number}`} className="text-primary hover:underline font-medium">
        {row.getValue('departure_number')}
      </Link>
    ),
  },
  createdAtColumn as ColumnDef<DepartureSummary>,
  createdByColumn as ColumnDef<DepartureSummary>,
  { accessorKey: "origin_code", header: "Warehouse", size: 90 },
  { accessorKey: "transporter", header: "Transporter" },
  { accessorKey: "destination", header: "Customer" },
  assetCountColumn as ColumnDef<DepartureSummary>,
  makeEditColumn<DepartureSummary>(row => `/departures/${row.departure_number}/edit`),
]
