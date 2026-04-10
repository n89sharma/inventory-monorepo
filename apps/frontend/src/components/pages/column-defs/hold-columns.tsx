import { Button } from "@/components/shadcn/button"
import type { HoldSummary } from 'shared-types'
import { ArrowsDownUpIcon, PencilSimpleIcon } from "@phosphor-icons/react"
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
      <Link to={`/holds/${row.original.hold_number}`} className="text-primary hover:underline font-medium">
        {row.getValue('hold_number')}
      </Link>
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
  },
  {
    header: "Edit",
    cell: ({ row }) => (
      <Button asChild variant="outline" size="icon" aria-label="Edit hold">
        <Link to={`/holds/${row.original.hold_number}/edit`}>
          <PencilSimpleIcon />
        </Link>
      </Button>
    )
  }
]