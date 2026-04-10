import { Button } from "@/components/shadcn/button"
import type { TransferSummary } from 'shared-types'
import { ArrowsDownUpIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Link } from "react-router-dom"

export const transferTableColumns: ColumnDef<TransferSummary>[] = [
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
      <Link to={`/transfers/${row.original.transfer_number}`} className="text-primary hover:underline font-medium">
        {row.getValue('transfer_number')}
      </Link>
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
  },
  {
    header: "Edit",
    cell: ({ row }) => (
      <Button asChild variant="outline" size="icon" aria-label="Edit transfer">
        <Link to={`/transfers/${row.original.transfer_number}/edit`}>
          <PencilSimpleIcon />
        </Link>
      </Button>
    )
  }
]