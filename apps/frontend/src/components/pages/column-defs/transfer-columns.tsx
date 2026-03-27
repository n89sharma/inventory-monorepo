import { Button } from "@/components/shadcn/button"
import type { Transfer } from 'shared-types'
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Link } from "react-router-dom"

export const transferTableColumns: ColumnDef<Transfer>[] = [
  {
    accessorKey: "transfer_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Transfer Number
          <ArrowsDownUpIcon />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Button asChild variant="link" className="h-0">
        <Link to={`/transfers/${row.original.transfer_number}`}>
          {row.getValue('transfer_number')}
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
    accessorKey: "origin_code",
    header: "Origin"
  },
  {
    accessorKey: "destination_code",
    header: "Destination"
  },
  {
    accessorKey: "transporter",
    header: "Transporter"
  },
  {
    accessorKey: "created_by",
    header: "Created By"
  }
]