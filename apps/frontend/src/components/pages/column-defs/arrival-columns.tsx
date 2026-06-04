import type { ColumnDef } from "@tanstack/react-table"
import type { ArrivalSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, createIdColumn } from './shared-columns'

export const arrivalTableColumns: ColumnDef<ArrivalSummary>[] = [
  createIdColumn<ArrivalSummary>({
    accessorKey: "arrival_number",
    header: "Arrival Number",
    href: row => `/arrivals/${row.arrival_number}`,
    value: row => row.arrival_number,
  }),
  createdAtColumn as ColumnDef<ArrivalSummary>,
  createdByColumn as ColumnDef<ArrivalSummary>,
  { accessorKey: "destination_code", header: "Warehouse", size: 80 },
  { accessorKey: "transporter", header: "Transporter" },
  { accessorKey: "vendor", header: "Vendor" },
  assetCountColumn as ColumnDef<ArrivalSummary>,
]
