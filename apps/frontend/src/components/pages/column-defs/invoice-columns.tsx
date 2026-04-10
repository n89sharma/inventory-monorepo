import { Button } from "@/components/shadcn/button"
import { ArrowsDownUpIcon, PencilSimpleIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import type { InvoiceSummary } from 'shared-types'

export const invoiceTableColumns: ColumnDef<InvoiceSummary>[] = [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Invoice Number
          <ArrowsDownUpIcon />
        </Button>
      )
    },
    cell: ({ row }) => (
      <Link to={`/invoices/${row.original.invoice_number}`} className="text-primary hover:underline font-medium">
        {row.getValue('invoice_number')}
      </Link>
    )
  },
  {
    accessorKey: "created_by",
    header: "Created By"
  },
  {
    accessorKey: "organization",
    header: "Organization"
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
    accessorKey: "is_cleared",
    header: "Cleared"
  },
  {
    accessorKey: "invoice_type",
    header: "Invoice Type"
  },
  {
    accessorKey: "asset_count",
    header: "Assets"
  },
  {
    header: "Edit",
    cell: ({ row }) => (
      <Button asChild variant="outline" size="icon" aria-label="Edit invoice">
        <Link to={`/invoices/${row.original.invoice_number}/edit`}>
          <PencilSimpleIcon />
        </Link>
      </Button>
    )
  }
]