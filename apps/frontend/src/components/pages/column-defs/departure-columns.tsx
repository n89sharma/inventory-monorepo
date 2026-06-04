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
  { accessorKey: "transporter", header: "Transporter" },
  { accessorKey: "destination", header: "Customer" },
  assetCountColumn as ColumnDef<DepartureSummary>,
]
