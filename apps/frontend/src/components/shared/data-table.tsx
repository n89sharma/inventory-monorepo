import type {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ExpandedState,
  Header,
  OnChangeFn,
  Table as ReactTableInstance,
  TableMeta,
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

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
  DotsSixVerticalIcon,
  FunnelSimpleIcon,
} from '@phosphor-icons/react'

interface DataTableProps<TData, TValue> {
  // The entity the rows describe, as a plural noun ('Assets', 'Users'). Names the scroll
  // region for screen readers, which append the word themselves, so it never says 'table'.
  label: string
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
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
  // Left uncontrolled, the order lives for the life of the mount. Pages that own column
  // state pass both so a drag persists wherever that state is stored.
  columnOrder?: ColumnOrderState
  onColumnOrderChange?: OnChangeFn<ColumnOrderState>
  renderTableFilter?: (table: ReactTableInstance<TData>) => React.ReactNode
  renderAboveTable?: (table: ReactTableInstance<TData>) => React.ReactNode
  // Faceting walks the filtered rows once per column to collect distinct values, so it
  // is only wired up by tables that render a facet-driven filter.
  facetedRowModels?: Pick<TableOptions<TData>, 'getFacetedRowModel' | 'getFacetedUniqueValues'>
  // Callbacks a cell renderer reaches through table.options.meta. Read at event time off
  // the live table instance, so DataRow's memo never serves a stale one.
  meta?: TableMeta<TData>
}

const DEFAULT_PAGE_SIZE = 75

export const TABLE_HEAD_CLASS =
  'whitespace-nowrap bg-muted text-center text-xs font-medium text-muted-foreground [&_button]:text-xs'

const TABLE_FOOT_CELL_CLASS = 'whitespace-nowrap text-center font-semibold'

const SCROLL_REGION_SLOT = 'table-scroll'
// Drawn on the bordered wrapper rather than the scroll region itself, whose own outline the
// wrapper's overflow-hidden would clip away.
const SCROLL_REGION_FOCUS_CLASS =
  'has-[>[data-slot=table-scroll]:focus-visible]:ring-3 has-[>[data-slot=table-scroll]:focus-visible]:ring-ring/50'

const CELL_BG =
  'bg-[var(--row-bg,var(--color-background))] ' +
  'group-hover/row:bg-[var(--row-bg-hover,var(--color-muted))] ' +
  'group-data-[state=selected]/row:bg-[var(--row-bg-hover,var(--color-muted))]'

const PIN_EDGE_SHADOW = 'shadow-[inset_-1px_0_0_var(--border)]'
const HEADER_Z_INDEX = 10
const PINNED_HEADER_Z_INDEX = 11
const PINNED_CELL_Z_INDEX = 1

// Pointer travel before a press on the grip counts as a drag, so a plain click never
// starts one.
const DRAG_ACTIVATION_DISTANCE = 4
const GRIP_ICON_SIZE = 14
const GRIP_LABEL = 'Reorder column'
const DRAGGING_HEAD_CLASS = 'opacity-40'
// Only ever applied to unpinned headers, so it never collides with PIN_EDGE_SHADOW.
const DROP_BEFORE_CLASS = 'shadow-[inset_2px_0_0_var(--color-primary)]'
const DROP_AFTER_CLASS = 'shadow-[inset_-2px_0_0_var(--color-primary)]'
// Cursors come from the --cursor-grab / --cursor-grabbing variables in global.css rather
// than the bare grab/grabbing keywords, which Chrome draws from an unscaled bitmap.
const GRIP_CLASS =
  'absolute left-0.5 top-1/2 -translate-y-1/2 opacity-0 transition-opacity ' +
  '[cursor:var(--cursor-grab)] active:[cursor:var(--cursor-grabbing)] ' +
  'group-hover/head:opacity-60 focus-visible:opacity-100'
const DRAG_CHIP_CLASS =
  'flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium shadow-md'

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

// A pinned column renders from the columnPinning array rather than from columnOrder, so
// dragging one would move it in state without moving it on screen.
function isReorderable<TData>(column: Column<TData>): boolean {
  if (column.getIsPinned()) return false
  return column.columnDef.meta?.reorderable ?? true
}

function headerCellStyle<TData>(header: Header<TData, unknown>): CSSProperties {
  return {
    width: header.column.columnDef.size,
    position: 'sticky',
    top: 0,
    zIndex: HEADER_Z_INDEX,
    ...pinnedLeftStyle(header.column, PINNED_HEADER_Z_INDEX),
  }
}

function headerCellClassName<TData>(header: Header<TData, unknown>): string {
  return `${TABLE_HEAD_CLASS} ${pinEdgeClass(header.column)} ${header.column.columnDef.meta?.cellClassName ?? ''}`
}

function headerContent<TData>(header: Header<TData, unknown>): React.ReactNode {
  if (header.isPlaceholder) return null
  return flexRender(header.column.columnDef.header, header.getContext())
}

function HeaderCell<TData>({ header }: { header: Header<TData, unknown> }): React.JSX.Element {
  if (!isReorderable(header.column)) return <StaticHeaderCell header={header} />
  return <SortableHeaderCell header={header} />
}

function StaticHeaderCell<TData>({
  header,
}: {
  header: Header<TData, unknown>
}): React.JSX.Element {
  return (
    <TableHead style={headerCellStyle(header)} className={headerCellClassName(header)}>
      {headerContent(header)}
    </TableHead>
  )
}

function dropIndicatorClass(isOver: boolean, activeIndex: number, index: number): string {
  if (!isOver || activeIndex === index) return ''
  if (activeIndex > index) return DROP_BEFORE_CLASS
  return DROP_AFTER_CLASS
}

function SortableHeaderCell<TData>({
  header,
}: {
  header: Header<TData, unknown>
}): React.JSX.Element {
  // The transform this returns is deliberately unused: shifting a header without shifting
  // the thousands of body cells below it would tear the column apart mid-drag.
  const { activeIndex, attributes, index, isDragging, isOver, listeners, setNodeRef } = useSortable(
    { id: header.column.id },
  )
  return (
    <TableHead
      ref={setNodeRef}
      style={headerCellStyle(header)}
      className={`group/head relative ${headerCellClassName(header)} ${isDragging ? DRAGGING_HEAD_CLASS : ''} ${dropIndicatorClass(isOver, activeIndex, index)}`}
    >
      {/* Labelled through aria-label rather than visually hidden text, which would land in
          the innerText the drag chip reads back. */}
      <button
        type="button"
        aria-label={GRIP_LABEL}
        className={GRIP_CLASS}
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon size={GRIP_ICON_SIZE} aria-hidden="true" />
      </button>
      {headerContent(header)}
    </TableHead>
  )
}

function ColumnDragChip({ label }: { label: string }): React.JSX.Element {
  return (
    <div className={DRAG_CHIP_CLASS}>
      <DotsSixVerticalIcon size={GRIP_ICON_SIZE} aria-hidden="true" />
      {label}
    </div>
  )
}

export function DataTable<TData, TValue>({
  label,
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
  onColumnVisibilityChange,
  columnOrder: controlledColumnOrder,
  onColumnOrderChange: onControlledColumnOrderChange,
  renderTableFilter,
  renderAboveTable,
  facetedRowModels,
  meta,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    defaultSort ? [defaultSort] : [],
  )
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [internalColumnOrder, setInternalColumnOrder] = useState<ColumnOrderState>([])
  const [draggedColumnLabel, setDraggedColumnLabel] = useState('')

  const rowSelection = controlledRowSelection ?? internalRowSelection
  const onRowSelectionChange = onControlledRowSelectionChange ?? setInternalRowSelection
  const sorting = controlledSorting ?? internalSorting
  const onSortingChange = onControlledSortingChange ?? setInternalSorting
  const columnOrder = controlledColumnOrder ?? internalColumnOrder
  const onColumnOrderChange = onControlledColumnOrderChange ?? setInternalColumnOrder

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
    onColumnVisibilityChange,
    onColumnOrderChange,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    ...facetedRowModels,
    meta,
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
      columnOrder,
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

  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const hasFooter = table
    .getVisibleLeafColumns()
    .some((column) => column.columnDef.footer !== undefined)

  const start = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, totalRows)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorderableColumnIds = table
    .getVisibleLeafColumns()
    .filter((column) => isReorderable(column))
    .map((column) => column.id)

  function handleDragStart({ activatorEvent }: DragStartEvent) {
    const grip = activatorEvent.target as HTMLElement | null
    setDraggedColumnLabel(grip?.closest('th')?.innerText.trim() ?? '')
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggedColumnLabel('')
    if (!over || active.id === over.id) return
    // An empty columnOrder means definition order, which indexOf cannot search: seed it
    // with the current leaf ids before splicing.
    const currOrder = columnOrder.length
      ? columnOrder
      : table.getAllLeafColumns().map((column) => column.id)
    const from = currOrder.indexOf(String(active.id))
    const to = currOrder.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    onColumnOrderChange(arrayMove(currOrder, from, to))
  }

  return (
    <div>
      {renderAboveTable?.(table)}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggedColumnLabel('')}
      >
        <SortableContext items={reorderableColumnIds} strategy={horizontalListSortingStrategy}>
          <div className={`overflow-hidden rounded-md border ${SCROLL_REGION_FOCUS_CLASS}`}>
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
            <div
              data-slot={SCROLL_REGION_SLOT}
              role="region"
              aria-label={label}
              tabIndex={0}
              className="overflow-x-auto outline-none"
            >
              <Table className={`table-auto w-max min-w-full`}>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <HeaderCell key={header.id} header={header} />
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table
                      .getRowModel()
                      .rows.map((row, rowPosition) => (
                        <DataRow
                          key={row.id}
                          row={row}
                          rowPosition={rowPosition}
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
                {hasFooter && (
                  <TableFooter>
                    {table.getFooterGroups().map((footerGroup) => (
                      <TableRow key={footerGroup.id}>
                        {footerGroup.headers.map((footer) => (
                          <TableCell
                            key={footer.id}
                            style={{
                              width: footer.column.columnDef.size,
                              ...pinnedLeftStyle(footer.column, PINNED_CELL_Z_INDEX),
                            }}
                            className={`${TABLE_FOOT_CELL_CLASS} ${pinEdgeClass(footer.column)} ${footer.column.columnDef.meta?.cellClassName ?? ''}`}
                          >
                            {footer.isPlaceholder
                              ? null
                              : flexRender(footer.column.columnDef.footer, footer.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableFooter>
                )}
              </Table>
            </div>
          </div>
        </SortableContext>
        <DragOverlay>
          {draggedColumnLabel.length > 0 && <ColumnDragChip label={draggedColumnLabel} />}
        </DragOverlay>
      </DndContext>

      <div className="flex flex-col items-center gap-2 p-2">
        <div className="text-sm text-semibold">
          <strong>
            {start}-{end}
          </strong>{' '}
          of <strong>{totalRows}</strong>
        </div>
        {table.getPageCount() > 1 && (
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
        )}
      </div>
    </div>
  )
}

function DataRowImpl<TData>({
  row,
  // Sorting and pagination reorder the same Row instances, so without the visual position in
  // the props this memo never busts on a reorder — which strands anything a cell derives from
  // its position, such as an editable grid's single keyboard entry point.
  rowPosition,
  cells,
  isSelected,
  isExpanded,
  onRowMouseEnter,
  getRowHref,
  getRowClassName,
}: {
  row: Row<TData>
  rowPosition: number
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
      data-row-position={rowPosition}
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

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role=checkbox]'

function hasTextSelection(): boolean {
  const selection = window.getSelection()
  return selection !== null && selection.toString().length > 0
}
