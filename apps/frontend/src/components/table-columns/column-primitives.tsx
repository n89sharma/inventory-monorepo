import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  ArrowDownIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  PencilSimpleIcon,
} from '@phosphor-icons/react'
import type { ColumnDef, HeaderContext, SortDirection } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export const ID_COLUMN_SIZE = 120
const ID_LINK_CLASS = 'font-mono text-foreground hover:underline'
export const SELECT_COLUMN_SIZE = 44
export const MODEL_COLUMN_SIZE = 100
export const SERIAL_NUMBER_COLUMN_SIZE = 150

export const PINNED_ASSET_COLUMN_IDS = ['select', 'barcode', 'serial_number', 'model']

export function IdLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={ID_LINK_CLASS}>
      {children}
    </Link>
  )
}

function SelectHitArea({ onActivate, children }: { onActivate: () => void; children: ReactNode }) {
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

function getHeaderCheckboxState(
  allSelected: boolean,
  someSelected: boolean,
): boolean | 'indeterminate' {
  if (allSelected) return true
  if (someSelected) return 'indeterminate'
  return false
}

export function createSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    size: SELECT_COLUMN_SIZE,
    enableSorting: false,
    enableHiding: false,
    meta: { cellClassName: 'p-0', reorderable: false },
    header: ({ table }) => (
      <SelectHitArea
        onActivate={() => table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected())}
      >
        <Checkbox
          checked={getHeaderCheckboxState(
            table.getIsAllPageRowsSelected(),
            table.getIsSomePageRowsSelected(),
          )}
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
  filterFn,
}: {
  accessorKey: string
  header: ColumnDef<TData>['header']
  href: (row: TData) => string
  value: (row: TData) => string
  filterFn?: ColumnDef<TData>['filterFn']
}): ColumnDef<TData> {
  return {
    accessorKey,
    header,
    filterFn,
    size: ID_COLUMN_SIZE,
    cell: ({ row }) => <IdLink to={href(row.original)}>{value(row.original)}</IdLink>,
  }
}

function SortIcon({ direction }: { direction: false | SortDirection }) {
  if (direction === 'asc') return <ArrowUpIcon />
  if (direction === 'desc') return <ArrowDownIcon />
  return <ArrowsDownUpIcon />
}

function SortableHeader({
  label,
  direction,
  onToggle,
}: {
  label: string
  direction: false | SortDirection
  onToggle: () => void
}) {
  return (
    <Button variant="ghost" onClick={onToggle} className="h-auto whitespace-normal py-1">
      {label}
      <SortIcon direction={direction} />
    </Button>
  )
}

export function sortableHeader<TData>(label: string) {
  return ({ column }: HeaderContext<TData, unknown>) => (
    <SortableHeader
      label={label}
      direction={column.getIsSorted()}
      onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    />
  )
}

export function createEditColumn<TData>(
  onEdit: (row: TData) => void,
  ariaLabel: string,
): ColumnDef<TData> {
  return {
    id: 'edit',
    header: 'Edit',
    enableSorting: false,
    meta: { reorderable: false },
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label={ariaLabel}
          onClick={() => onEdit(row.original)}
        >
          <PencilSimpleIcon />
        </Button>
      </div>
    ),
  }
}
