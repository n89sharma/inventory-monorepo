import { CopyButton } from "@/components/custom/copy-button"
import { Button } from "@/components/shadcn/button"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "react-router-dom"
import type { TransferSummary } from 'shared-types'
import { assetCountColumn, createdAtColumn, createdByColumn, makeEditColumn } from './shared-columns'

export const transferTableColumns: ColumnDef<TransferSummary>[] = [
  {
    accessorKey: "transfer_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Transfer Number
        <ArrowsDownUpIcon />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="group flex items-center justify-center gap-2">
        <Link to={`/transfers/${row.original.transfer_number}`} className="text-primary hover:underline font-medium">
          {row.getValue('transfer_number')}
        </Link>
        <CopyButton value={row.original.transfer_number} />
      </div>
    ),
    size: 140
  },
  createdAtColumn as ColumnDef<TransferSummary>,
  { accessorKey: "origin_code", header: "Origin", size: 90 },
  { accessorKey: "destination_code", header: "Destination", size: 90 },
  { accessorKey: "transporter", header: "Transporter" },
  createdByColumn as ColumnDef<TransferSummary>,
  assetCountColumn as ColumnDef<TransferSummary>,
  makeEditColumn<TransferSummary>(row => `/transfers/${row.transfer_number}/edit`),
]
