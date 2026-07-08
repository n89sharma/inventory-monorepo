import type {
  Column,
  ColumnDef,
  ExpandedState,
  OnChangeFn,
  Row,
  RowData,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { memo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    cellClassName?: string
  }
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'

import { Button } from '@/components/shadcn/button'
import { SELECT_COLUMN_SIZE } from '@/components/table-columns/shared-columns'
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  FunnelSimpleIcon,
} from '@phosphor-icons/react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowMouseEnter?: (row: TData) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (originalRow: TData, index: number) => string
  initialPageSize?: number
  defaultSort?: { id: string; desc: boolean }
  pinLeft?: string[]
  getRowHref?: (row: TData) => string
  getRowClassName?: (row: TData) => string | undefined
  getSubRows?: (row: TData) => TData[] | undefined
  columnVisibility?: VisibilityState
  scrollMaxHeight?: string
  tableFilter?: React.ReactNode
}

const CELL_BG =
  'bg-[var(--row-bg,var(--color-background))] ' +
  'group-hover/row:bg-[var(--row-bg-hover,var(--color-muted))] ' +
  'group-data-[state=selected]/row:bg-[var(--row-bg-hover,var(--color-muted))]'

function pinStyle<TData>(column: Column<TData>): CSSProperties {
  if (column.getIsPinned() !== 'left') return {}
  return {
    position: 'sticky',
    left: column.getStart('left'),
    zIndex: 1,
  }
}

const SCROLL_BOX_MAX_HEIGHT =
  'calc(100vh - var(--app-header-height, 0px) - var(--details-header-height, 0px) - 7rem)'

function headerStickyStyle<TData>(column: Column<TData>): CSSProperties {
  if (column.getIsPinned() === 'left') {
    return {
      position: 'sticky',
      top: 0,
      left: column.getStart('left'),
      zIndex: 11,
    }
  }
  return { position: 'sticky', top: 0, zIndex: 10 }
}

function pinHeaderClass<TData>(column: Column<TData>): string {
  const shadow =
    column.getIsPinned() === 'left' && column.getIsLastColumn('left')
      ? 'shadow-[inset_-1px_0_0_var(--border)]'
      : ''
  return `bg-muted ${shadow}`.trim()
}

function pinShadowClass<TData>(column: Column<TData>): string {
  if (column.getIsPinned() !== 'left') return ''
  return column.getIsLastColumn('left') ? 'shadow-[inset_-1px_0_0_var(--border)]' : ''
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowMouseEnter,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: onControlledRowSelectionChange,
  getRowId,
  initialPageSize = 25,
  defaultSort,
  pinLeft,
  getRowHref,
  getRowClassName,
  getSubRows,
  columnVisibility,
  scrollMaxHeight = SCROLL_BOX_MAX_HEIGHT,
  tableFilter,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSort ? [defaultSort] : [])
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const rowSelection = controlledRowSelection ?? internalRowSelection
  const onRowSelectionChange = onControlledRowSelectionChange ?? setInternalRowSelection

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onRowSelectionChange,
    getRowId,
    getSubRows,
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    paginateExpandedRows: false,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      expanded,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
        pageIndex: 0,
      },
      columnPinning: { left: pinLeft ?? [], right: [] },
    },
  })

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length

  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
        {tableFilter && (
          <div className="flex items-center gap-4 border-b bg-muted py-2 pr-2">
            <div
              className="flex shrink-0 items-center justify-center pl-4"
              style={{ width: SELECT_COLUMN_SIZE }}
            >
              <FunnelSimpleIcon className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            {tableFilter}
          </div>
        )}
        <div className="overflow-auto" style={{ maxHeight: scrollMaxHeight }}>
          <Table className="table-fixed !w-max min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize(), ...headerStickyStyle(header.column) }}
                        className={`whitespace-normal text-center text-xs font-medium text-muted-foreground ${pinHeaderClass(header.column)} ${header.column.columnDef.meta?.cellClassName ?? ''}`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table
                  .getRowModel()
                  .rows.map((row) => (
                    <DataRow
                      key={row.id}
                      row={row}
                      isSelected={row.getIsSelected()}
                      isExpanded={row.getIsExpanded()}
                      onRowMouseEnter={onRowMouseEnter}
                      getRowHref={getRowHref}
                      getRowClassName={getRowClassName}
                      columnVisibility={columnVisibility}
                    />
                  ))
              ) : (
                <TableRow role="status" aria-live="polite">
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 p-2">
        <div className="text-sm text-semibold">
          <strong>
            {start}-{end}
          </strong>{' '}
          of <strong>{totalRows}</strong>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <CaretDoubleLeftIcon aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <CaretLeftIcon aria-hidden="true" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <CaretRightIcon aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            <CaretDoubleRightIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function DataRowImpl<TData>({
  row,
  isSelected,
  isExpanded,
  onRowMouseEnter,
  getRowHref,
  getRowClassName,
}: {
  row: Row<TData>
  isSelected: boolean
  isExpanded?: boolean
  onRowMouseEnter?: (row: TData) => void
  getRowHref?: (row: TData) => string
  getRowClassName?: (row: TData) => string | undefined
  columnVisibility?: VisibilityState
}) {
  const navigate = useNavigate()
  const canExpand = row.getCanExpand()
  return (
    <TableRow
      data-state={isSelected && 'selected'}
      data-expanded={isExpanded || undefined}
      className={`group/row ${getRowHref || canExpand ? 'cursor-pointer' : ''} ${getRowClassName?.(row.original) ?? ''}`.trim()}
      onMouseEnter={() => onRowMouseEnter?.(row.original)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return
        if (hasTextSelection()) return
        if (canExpand) {
          row.toggleExpanded()
          return
        }
        if (!getRowHref) return
        const href = getRowHref(row.original)
        if (e.metaKey || e.ctrlKey) window.open(href, '_blank')
        else navigate(href)
      }}
      onAuxClick={(e) => {
        if (e.button !== 1 || canExpand || !getRowHref) return
        if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return
        window.open(getRowHref(row.original), '_blank')
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          style={{ width: cell.column.getSize(), ...pinStyle(cell.column) }}
          className={`relative whitespace-normal text-center ${CELL_BG} ${pinShadowClass(cell.column)} ${cell.column.columnDef.meta?.cellClassName ?? ''}`}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

const DataRow = memo(DataRowImpl) as typeof DataRowImpl

const INTERACTIVE_SELECTOR = 'a, button, [role=checkbox]'

function hasTextSelection(): boolean {
  const selection = window.getSelection()
  return selection !== null && selection.toString().length > 0
}
