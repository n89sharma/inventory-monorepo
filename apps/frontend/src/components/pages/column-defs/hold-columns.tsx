import { Button } from "@/components/shadcn/button"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { HoldSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, makeEditColumn } from './shared-columns'

export const holdTableColumns: ColumnDef<HoldSummary>[] = [
  {
    accessorKey: "hold_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Hold Number
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ row }) => (
      <Link to={`/holds/${row.original.hold_number}`} className="text-primary hover:underline font-medium">
        {row.getValue('hold_number')}
      </Link>
    ),
    size: 140
  },
  createdByColumn as ColumnDef<HoldSummary>,
  { accessorKey: "created_for", header: "Created For" },
  { accessorKey: "customer", header: "Customer" },
  createdAtColumn as ColumnDef<HoldSummary>,
  assetCountColumn as ColumnDef<HoldSummary>,
  makeEditColumn<HoldSummary>(row => `/holds/${row.hold_number}/edit`),
]
