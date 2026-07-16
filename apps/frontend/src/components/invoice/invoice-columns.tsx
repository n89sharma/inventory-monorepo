import {
  assetCountColumn,
  createIdColumn,
  createdAtColumn,
  createdByColumn,
} from '@/components/table-columns/shared-columns'
import { Checkbox } from '@/components/shadcn/checkbox'
import { formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { InvoiceSummary } from 'shared-types'

export const invoiceTableColumns: ColumnDef<InvoiceSummary>[] = [
  {
    ...createIdColumn<InvoiceSummary>({
      accessorKey: 'invoice_reference',
      header: 'Reference Invoice Number',
      href: (row) => `/invoices/${row.invoice_number}`,
      value: (row) => row.invoice_reference,
    }),
    filterFn: 'includesString',
  },
  createdAtColumn as ColumnDef<InvoiceSummary>,
  createdByColumn as ColumnDef<InvoiceSummary>,
  {
    accessorKey: 'organization',
    header: 'Organization',
    cell: ({ row }) => formatTitleCase(row.original.organization ?? ''),
  },
  {
    accessorKey: 'is_cleared',
    header: 'Cleared',
    size: 50,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox checked={row.original.is_cleared} />
      </div>
    ),
  },
  {
    accessorKey: 'invoice_type',
    header: 'Invoice Type',
    cell: ({ row }) => formatTitleCase(row.original.invoice_type ?? ''),
  },
  assetCountColumn as ColumnDef<InvoiceSummary>,
]
