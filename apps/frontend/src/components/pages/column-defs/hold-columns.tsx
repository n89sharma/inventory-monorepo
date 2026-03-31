import { Button } from "@/components/shadcn/button"
import type { HoldSummary } from 'shared-types'
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Link } from "react-router-dom"

export const holdTableColumns: ColumnDef<HoldSummary>[] = [
  {
    accessorKey: "hold_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Hold Number
          <ArrowsDownUpIcon />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Button asChild variant="link" className="h-0">
        <Link to={`/holds/${row.original.hold_number}`}>
          {row.getValue('hold_number')}
        </Link>
      </Button>
    )
  },
  {
    accessorKey: "created_by",
    header: "Created By"
  },
  {
    accessorKey: "created_for",
    header: "Created For"
  },
  {
    accessorKey: "customer",
    header: "Customer"
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
  }
]