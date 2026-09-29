import { DepartureStatusBadge } from '@/components/departure/departure-status-badge'
import { createIdColumn } from '@/components/table-columns/column-primitives'
import {
  assetCountColumnDef,
  createdByColumnDef,
} from '@/components/table-columns/collection-summary-columns'
import { formatDateParam } from '@/lib/date-param'
import { formatDateOnly } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { DepartureSummary } from 'shared-types'

export function departureTableColumns(
  getHref: (row: DepartureSummary) => string,
): ColumnDef<DepartureSummary>[] {
  return [
    createIdColumn<DepartureSummary>({
      accessorKey: 'departure_number',
      header: 'Departure Number',
      href: getHref,
      value: (row) => row.departure_number,
    }),
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <DepartureStatusBadge status={row.original.status} />,
    },
    {
      id: 'departure_date',
      header: 'Date',
      accessorFn: (row) => row.departure_date ?? formatDateParam(row.created_at),
      cell: ({ getValue }) => formatDateOnly(getValue<string>()),
    },
    createdByColumnDef as ColumnDef<DepartureSummary>,
    { accessorKey: 'salesperson', header: 'Salesperson' },
    { accessorKey: 'origin_code', header: 'Warehouse' },
    {
      accessorKey: 'transporter',
      header: 'Transporter',
      cell: ({ row }) => row.original.transporter ?? '',
    },
    {
      accessorKey: 'destination',
      header: 'Customer',
      cell: ({ row }) => row.original.destination ?? '',
    },
    assetCountColumnDef as ColumnDef<DepartureSummary>,
  ]
}
