import { createIdColumn, sortableHeader } from '@/components/table-columns/column-primitives'
import {
  assetCountColumn,
  createdByColumn,
} from '@/components/table-columns/collection-summary-columns'
import { ArrivalLinks } from '@/components/shared/arrival-links'
import { Checkbox } from '@/components/shadcn/checkbox'
import { formatDate, formatTitleCase } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
import type { InvoiceSummary } from 'shared-types'

const invoiceDateColumn: ColumnDef<InvoiceSummary> = {
  accessorKey: 'invoice_date',
  header: sortableHeader<InvoiceSummary>('Date'),
  cell: ({ row }) => formatDate(parseISO(row.original.invoice_date)),
  size: 140,
}

const clearedColumn: ColumnDef<InvoiceSummary> = {
  accessorKey: 'is_cleared',
  header: 'Cleared',
  cell: ({ row }) => (
    <div className="flex justify-center">
      <Checkbox checked={row.original.is_cleared} />
    </div>
  ),
}

const warehouseColumn: ColumnDef<InvoiceSummary> = {
  accessorKey: 'destination_codes',
  header: 'Warehouse',
  enableSorting: false,
  cell: ({ row }) => row.original.destination_codes.join(', '),
}

const arrivalNumbersColumn: ColumnDef<InvoiceSummary> = {
  accessorKey: 'arrival_numbers',
  header: 'Arrival IDs',
  enableSorting: false,
  cell: ({ row }) => <ArrivalLinks arrivalNumbers={row.original.arrival_numbers} />,
}

const transportersColumn: ColumnDef<InvoiceSummary> = {
  accessorKey: 'transporters',
  header: 'Transporters',
  enableSorting: false,
  cell: ({ row }) => row.original.transporters.join(', '),
}

const notesColumn: ColumnDef<InvoiceSummary> = {
  accessorKey: 'notes',
  header: 'Notes',
  enableSorting: false,
  cell: ({ row }) => row.original.notes,
}

export function invoiceTableColumns(
  getHref: (row: InvoiceSummary) => string,
  organizationHeader: string,
  includeClearedColumn: boolean,
  includeArrivalColumns: boolean,
): ColumnDef<InvoiceSummary>[] {
  return [
    invoiceDateColumn,
    {
      ...createIdColumn<InvoiceSummary>({
        accessorKey: 'invoice_reference',
        header: 'Reference Invoice Number',
        href: getHref,
        value: (row) => row.invoice_reference,
      }),
      filterFn: 'includesString',
    },
    {
      accessorKey: 'organization',
      header: sortableHeader<InvoiceSummary>(organizationHeader),
      cell: ({ row }) => formatTitleCase(row.original.organization ?? ''),
      filterFn: 'includesString',
    },
    ...(includeArrivalColumns ? [warehouseColumn, arrivalNumbersColumn, transportersColumn] : []),
    ...(includeClearedColumn ? [clearedColumn] : []),
    notesColumn,
    assetCountColumn as ColumnDef<InvoiceSummary>,
    createdByColumn as ColumnDef<InvoiceSummary>,
  ]
}
