import { Checkbox } from "@/components/shadcn/checkbox"
import { formatTitleCase } from "@/lib/formatters"
import type { ColumnDef } from "@tanstack/react-table"
import type { InvoiceSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, createIdColumn } from './shared-columns'

export const invoiceTableColumns: ColumnDef<InvoiceSummary>[] = [
  createIdColumn<InvoiceSummary>({
    accessorKey: "invoice_number",
    header: "Invoice Number",
    href: row => `/invoices/${row.invoice_number}`,
    value: row => row.invoice_number,
  }),
  {
    accessorKey: "invoice_reference",
    header: "Reference",
    cell: ({ row }) => row.original.invoice_reference,
  },
  createdAtColumn as ColumnDef<InvoiceSummary>,
  createdByColumn as ColumnDef<InvoiceSummary>,
  {
    accessorKey: "organization",
    header: "Organization",
    cell: ({ row }) => formatTitleCase(row.original.organization ?? ''),
  },
  {
    accessorKey: "is_cleared",
    header: "Cleared",
    size: 50,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox checked={row.original.is_cleared} />
      </div>
    ),
  },
  {
    accessorKey: "invoice_type",
    header: "Invoice Type",
    cell: ({ row }) => formatTitleCase(row.original.invoice_type ?? ''),
  },
  assetCountColumn as ColumnDef<InvoiceSummary>,
]
