import { Button } from "@/components/shadcn/button"
import { ArrowsDownUpIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import type { ArrivalSummary } from 'shared-types'

export const arrivalTableColumns: ColumnDef<ArrivalSummary>[] = [
  {
    accessorKey: "arrival_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Arrival Number
          <ArrowsDownUpIcon />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Button asChild variant="link" className="h-0">
        <Link to={`/arrivals/${row.original.arrival_number}`}>
          {row.getValue('arrival_number')}
        </Link>
      </Button>
    )
  },
  {
    accessorKey: "created_at",
    cell: ({ getValue }) => {
      const date = getValue<Date>()
      return date ? format(date, "PPP") : "-"
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowsDownUpIcon />
        </Button>
      )
    },
  },
  {
    accessorKey: "created_by",
    header: "Created By"
  },
  {
    accessorKey: "destination_code",
    header: "Warehouse"
  },
  {
    accessorKey: "transporter",
    header: "Transporter"
  },
  {
    accessorKey: "vendor",
    header: "Vendor"
  },
  {
    header: "Edit",
    cell: ({ row }) => {
      return (

        <Link to={`/arrivals/${row.original.arrival_number}/edit`}>
          <Button
            variant="outline"
            size="icon"
            asChild={false}
            className="cursor-pointer"
          >
            <PencilSimpleIcon />
          </Button >
        </Link >

      )
    }
  }
]
