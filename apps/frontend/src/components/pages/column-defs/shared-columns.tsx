import { Button } from "@/components/shadcn/button"
import { Checkbox } from "@/components/shadcn/checkbox"
import { AssetTypeBreakdown } from "@/components/custom/asset-type-breakdown"
import { formatDate } from "@/lib/formatters"
import { ArrowsDownUpIcon } from "@phosphor-icons/react"
import type { ColumnDef } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import type { CollectionSummarySchema } from 'shared-types'

const ID_COLUMN_SIZE = 120
const SELECT_COLUMN_SIZE = 44

function SelectHitArea({
  onActivate,
  children,
}: {
  onActivate: () => void
  children: ReactNode
}) {
  return (
    <div
      className="absolute inset-0 flex cursor-pointer items-center justify-center"
      onClick={(e) => {
        e.stopPropagation()
        if ((e.target as HTMLElement).closest('[role=checkbox]')) return
        onActivate()
      }}
    >
      {children}
    </div>
  )
}

export function createSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    size: SELECT_COLUMN_SIZE,
    enableSorting: false,
    enableHiding: false,
    meta: { cellClassName: 'p-0' },
    header: ({ table }) => (
      <SelectHitArea
        onActivate={() =>
          table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected())
        }
      >
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all on this page"
        />
      </SelectHitArea>
    ),
    cell: ({ row }) => (
      <SelectHitArea onActivate={() => row.toggleSelected()}>
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </SelectHitArea>
    ),
  }
}

export function createIdColumn<TData>({
  accessorKey,
  header,
  href,
  value,
}: {
  accessorKey: string
  header: string
  href: (row: TData) => string
  value: (row: TData) => string
}): ColumnDef<TData> {
  return {
    accessorKey,
    header,
    size: ID_COLUMN_SIZE,
    cell: ({ row }) => (
      <Link
        to={href(row.original)}
        className="font-mono text-foreground hover:underline"
      >
        {value(row.original)}
      </Link>
    ),
  }
}

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
  header: "Copiers / Total",
  size: 110,
  cell: ({ row }) => <AssetTypeBreakdown summary={row.original} />,
}
