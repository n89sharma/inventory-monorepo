import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import type { ColumnDef, Row, Table } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export const ID_COLUMN_SIZE = 120
const ID_LINK_CLASS = 'font-mono text-foreground hover:underline'
const SELECT_COLUMN_SIZE = 44
export const MODEL_COLUMN_SIZE = 100
export const SERIAL_NUMBER_COLUMN_SIZE = 150

export const PINNED_ASSET_COLUMN_IDS = ['select', 'barcode']

export const SEARCHABLE_ASSET_COLUMN_IDS = ['barcode', 'serial_number', 'model']

export function IdLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={ID_LINK_CLASS}>
      {children}
    </Link>
  )
}

const selectionAnchorRowIds = new WeakMap<object, string>()

function toggleRowSelection<TData>(table: Table<TData>, row: Row<TData>, extendsRange: boolean) {
  const newSelected = !row.getIsSelected()
  const rows = table.getRowModel().rows
  const prevAnchorRowId = selectionAnchorRowIds.get(table)
  selectionAnchorRowIds.set(table, row.id)
  const anchorIndex = extendsRange ? rows.findIndex((r) => r.id === prevAnchorRowId) : -1
  if (anchorIndex === -1) {
    row.toggleSelected(newSelected)
    return
  }
  const rowIndex = rows.findIndex((r) => r.id === row.id)
  const range = rows.slice(Math.min(anchorIndex, rowIndex), Math.max(anchorIndex, rowIndex) + 1)
  table.setRowSelection((prevSelection) => {
    const newSelection = { ...prevSelection }
    for (const rangeRow of range) {
      if (!rangeRow.getCanSelect()) continue
      if (newSelected) newSelection[rangeRow.id] = true
      else delete newSelection[rangeRow.id]
    }
    return newSelection
  })
}

function SelectHitArea({
  onActivate,
  children,
}: {
  onActivate: (extendsRange: boolean) => void
  children: ReactNode
}) {
  return (
    <div
      className="absolute inset-0 flex cursor-pointer items-center justify-center"
      onMouseDown={(e) => {
        if (e.shiftKey) e.preventDefault()
      }}
      onClick={(e) => {
        e.stopPropagation()
        if ((e.target as HTMLElement).closest('[role=checkbox]')) return
        onActivate(e.shiftKey)
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
    minSize: SELECT_COLUMN_SIZE,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
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
    cell: ({ row, table }) => (
      <SelectHitArea onActivate={(extendsRange) => toggleRowSelection(table, row, extendsRange)}>
        <Checkbox
          checked={row.getIsSelected()}
          onClick={(e) => {
            e.preventDefault()
            toggleRowSelection(table, row, e.shiftKey)
          }}
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
  header: string
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

export function createEditColumn<TData>(
  onEdit: (row: TData) => void,
  ariaLabel: string,
): ColumnDef<TData> {
  return {
    id: 'edit',
    header: 'Edit',
    enableSorting: false,
    enableResizing: false,
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
