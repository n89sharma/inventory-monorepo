import { Button } from "@/components/shadcn/button"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { InvoiceSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, makeEditColumn } from './shared-columns'

export const invoiceTableColumns: ColumnDef<InvoiceSummary>[] = [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Invoice Number
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ row }) => (
      <Link to={`/invoices/${row.original.invoice_number}`} className="text-primary hover:underline font-medium">
        {row.getValue('invoice_number')}
      </Link>
    ),
    size: 140
  },
  createdAtColumn as ColumnDef<InvoiceSummary>,
  createdByColumn as ColumnDef<InvoiceSummary>,
  { accessorKey: "organization", header: "Organization" },
  { accessorKey: "is_cleared", header: "Cleared", size: 50 },
  { accessorKey: "invoice_type", header: "Invoice Type" },
  assetCountColumn as ColumnDef<InvoiceSummary>,
  makeEditColumn<InvoiceSummary>(row => `/invoices/${row.invoice_number}/edit`),
]
