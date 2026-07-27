import type {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  OnChangeFn,
  Table as ReactTableInstance,
  TableOptions,
  Row,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'

import { Button } from '@/components/shadcn/button'
import { SELECT_COLUMN_SIZE } from '@/components/table-columns/column-primitives'
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  FunnelSimpleIcon,
} from '@phosphor-icons/react'

export type DataTableSelection<TData> = {
  selectedRows: TData[]
  visibleCount: number
  totalCount: number
  hiddenCount: number
  selectAllVisible: () => void
  clearSelection: () => void
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowMouseEnter?: (row: TData) => void
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  getRowId?: (originalRow: TData, index: number) => string
  defaultSort?: { id: string; desc: boolean }
  pinLeft?: string[]
  getRowHref?: (row: TData) => string
  getRowClassName?: (row: TData) => string | undefined
  getSubRows?: (row: TData) => TData[] | undefined
  columnVisibility?: VisibilityState
  renderTableFilter?: (table: ReactTableInstance<TData>) => React.ReactNode
  onSelectionChange?: (selection: DataTableSelection<TData>) => void
  // Faceting walks the filtered rows once per column to collect distinct values, so it
  // is only wired up by tables that render a facet-driven filter.
  facetedRowModels?: Pick<TableOptions<TData>, 'getFacetedRowModel' | 'getFacetedUniqueValues'>
}

const DEFAULT_PAGE_SIZE = 75

const CELL_BG =
  'bg-[var(--row-bg,var(--color-background))] ' +
  'group-hover/row:bg-[var(--row-bg-hover,var(--color-muted))] ' +
  'group-data-[state=selected]/row:bg-[var(--row-bg-hover,var(--color-muted))]'

const PIN_EDGE_SHADOW = 'shadow-[inset_-1px_0_0_var(--border)]'
const HEADER_Z_INDEX = 10
const PINNED_HEADER_Z_INDEX = 11
const PINNED_CELL_Z_INDEX = 1

// Spread over a base style: contributes nothing unless the column is pinned, so the
// caller supplies the z-index that a pinned cell needs to win over its own layer.
function pinnedLeftStyle<TData>(column: Column<TData>, zIndex: number): CSSProperties {
  if (column.getIsPinned() !== 'left') return {}
  return { position: 'sticky', left: column.getStart('left'), zIndex }
}

function pinEdgeClass<TData>(column: Column<TData>): string {
  const isPinnedEdge = column.getIsPinned() === 'left' && column.getIsLastColumn('left')
  return isPinnedEdge ? PIN_EDGE_SHADOW : ''
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowMouseEnter,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: onControlledRowSelectionChange,
  sorting: controlledSorting,
  onSortingChange: onControlledSortingChange,
  getRowId,
  defaultSort,
  pinLeft,
  getRowHref,
  getRowClassName,
  getSubRows,
  columnVisibility,
  renderTableFilter,
  onSelectionChange,
  facetedRowModels,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    defaultSort ? [defaultSort] : [],
  )
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const rowSelection = controlledRowSelection ?? internalRowSelection
  const onRowSelectionChange = onControlledRowSelectionChange ?? setInternalRowSelection
  const sorting = controlledSorting ?? internalSorting
  const onSortingChange = onControlledSortingChange ?? setInternalSorting

  // Hover only triggers a prefetch, so its identity never affects what a row renders.
  // Holding it in a ref lets callers pass an inline arrow without breaking DataRow's memo.
  const onRowMouseEnterRef = useRef(onRowMouseEnter)
  useEffect(() => {
    onRowMouseEnterRef.current = onRowMouseEnter
  })
  const handleRowMouseEnter = useCallback((row: TData) => onRowMouseEnterRef.current?.(row), [])

  const table = useReactTable({
    data,
    columns,
    defaultColumn: { size: undefined },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    ...facetedRowModels,
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
      columnFilters,
      columnVisibility,
      expanded,
    },
    initialState: {
      pagination: {
        pageSize: DEFAULT_PAGE_SIZE,
        pageIndex: 0,
      },
      columnPinning: { left: pinLeft ?? [], right: [] },
    },
  })

  useEffect(() => {
    if (!onSelectionChange) return
    const visibleRows = table.getFilteredRowModel().rows
    const totalCount = table.getCoreRowModel().rows.length
    onSelectionChange({
      selectedRows: table.getFilteredSelectedRowModel().rows.map((row) => row.original),
      visibleCount: visibleRows.length,
      totalCount,
      hiddenCount: totalCount - visibleRows.length,
      selectAllVisible: () =>
        table.setRowSelection(Object.fromEntries(visibleRows.map((row) => [row.id, true]))),
      clearSelection: () => table.resetRowSelection(),
    })
  }, [onSelectionChange, table, rowSelection, columnFilters, data])

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length

  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalRows)

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
        {renderTableFilter && (
          <div className="flex items-center gap-4 border-b bg-muted py-2 pr-2">
            <div
              className="flex shrink-0 items-center justify-center pl-4"
              style={{ width: SELECT_COLUMN_SIZE }}
            >
              <FunnelSimpleIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            {renderTableFilter(table)}
          </div>
        )}
        <div className="overflow-x-auto">
          <Table className={`table-auto w-max min-w-full`}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        style={{
                          width: header.column.columnDef.size,
                          position: 'sticky',
                          top: 0,
                          zIndex: HEADER_Z_INDEX,
                          ...pinnedLeftStyle(header.column, PINNED_HEADER_Z_INDEX),
                        }}
                        className={`whitespace-nowrap bg-muted text-center text-xs font-medium text-muted-foreground [&_button]:text-xs ${pinEdgeClass(header.column)} ${header.column.columnDef.meta?.cellClassName ?? ''}`}
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
                      onRowMouseEnter={handleRowMouseEnter}
                      getRowHref={getRowHref}
                      getRowClassName={getRowClassName}
                      cells={row.getVisibleCells()}
                    />
                  ))
              ) : (
                <TableRow role="status" aria-live="polite">
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center"
                  >
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
  cells,
  isSelected,
  isExpanded,
  onRowMouseEnter,
  getRowHref,
  getRowClassName,
}: {
  row: Row<TData>
  cells: Cell<TData, unknown>[]
  isSelected: boolean
  isExpanded?: boolean
  onRowMouseEnter?: (row: TData) => void
  getRowHref?: (row: TData) => string
  getRowClassName?: (row: TData) => string | undefined
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
      {cells.map((cell) => (
        <TableCell
          key={cell.id}
          style={{
            width: cell.column.columnDef.size,
            ...pinnedLeftStyle(cell.column, PINNED_CELL_Z_INDEX),
          }}
          className={`relative whitespace-nowrap text-center ${CELL_BG} ${pinEdgeClass(cell.column)} ${cell.column.columnDef.meta?.cellClassName ?? ''}`}
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
