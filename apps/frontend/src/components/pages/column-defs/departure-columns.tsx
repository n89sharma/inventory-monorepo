import { formatTitleCase } from "@/lib/formatters"
import type { ColumnDef } from "@tanstack/react-table"
import type { DepartureSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, createIdColumn } from './shared-columns'

export const departureTableColumns: ColumnDef<DepartureSummary>[] = [
  createIdColumn<DepartureSummary>({
    accessorKey: "departure_number",
    header: "Departure Number",
    href: row => `/departures/${row.departure_number}`,
    value: row => row.departure_number,
  }),
  createdAtColumn as ColumnDef<DepartureSummary>,
  createdByColumn as ColumnDef<DepartureSummary>,
  { accessorKey: "origin_code", header: "Warehouse", size: 90 },
  {
    accessorKey: "transporter",
    header: "Transporter",
    cell: ({ row }) => formatTitleCase(row.original.transporter ?? ''),
  },
  {
    accessorKey: "destination",
    header: "Customer",
    cell: ({ row }) => formatTitleCase(row.original.destination ?? ''),
  },
  assetCountColumn as ColumnDef<DepartureSummary>,
]
