import { Button } from "@/components/shadcn/button"
import type { Departure } from 'shared-types'
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Link } from "react-router-dom"

export const departureTableColumns: ColumnDef<Departure>[] = [
  {
    accessorKey: "departure_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Departure Number
          <ArrowsDownUpIcon />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Button asChild variant="link" className="h-0">
        <Link to={`/departures/${row.original.departure_number}`}>
          {row.getValue('departure_number')}
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
    accessorKey: "origin_code",
    header: "Warehouse"
  },
  {
    accessorKey: "transporter",
    header: "Transporter"
  },
  {
    accessorKey: "destination",
    header: "Customer"
  }
]