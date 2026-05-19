import { Button } from "@/components/shadcn/button"
import { formatDate } from "@/lib/formatters"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { CollectionSummarySchema } from 'shared-types'

export const createdAtColumn: ColumnDef<CollectionSummarySchema> = {
  accessorKey: "created_at",
  cell: ({ getValue }) => {
    const date = getValue<Date>()
    return date ? formatDate(date) : "-"
  },
  header: ({ column }) => (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      Date
      <ArrowsDownUpIcon />
    </Button>
  ),
  size: 140
}

export const createdByColumn: ColumnDef<CollectionSummarySchema> = {
  accessorKey: "created_by",
  header: "Created By",
  size: 120
}

export const assetCountColumn: ColumnDef<CollectionSummarySchema> = {
  accessorKey: "asset_count",
  header: "Assets",
  size: 50,
}
