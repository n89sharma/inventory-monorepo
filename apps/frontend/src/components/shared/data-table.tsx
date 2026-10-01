import type {
  Cell,
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ExpandedState,
  Header,
  OnChangeFn,
  Table as ReactTableInstance,
  TableMeta,
  TableOptions,
  Row,
  RowSelectionState,
  SortDirection,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'

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
import { useVirtualizer } from '@tanstack/react-virtual'
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

import { TableResultCount, TableToolbar, TableToolbarEnd } from '@/components/shared/table-toolbar'
import { useGridScrollRestoration } from '@/hooks/use-grid-scroll-restoration'
import { ArrowDownIcon, ArrowUpIcon, DotsSixVerticalIcon } from '@phosphor-icons/react'

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
  renderToolbar?: (table: ReactTableInstance<TData>) => React.ReactNode
  renderAboveTable?: (table: ReactTableInstance<TData>) => React.ReactNode
  // Faceting walks the filtered rows once per column to collect distinct values, so it
  // is only wired up by tables that render a facet-driven filter.
  facetedRowModels?: Pick<TableOptions<TData>, 'getFacetedRowModel' | 'getFacetedUniqueValues'>
  // A row survives the search when any opted-in column contains the query. The caller names
  // those columns, because the TanStack default admits every string column it finds.
  textSearch?: Pick<TableOptions<TData>, 'getColumnCanGlobalFilter'>
  // Callbacks a cell renderer reaches through table.options.meta. Read at event time off
  // the live table instance, so DataRow's memo never serves a stale one.
  meta?: TableMeta<TData>
}

type DataTableBaseProps<TData, TValue> = DataTableProps<TData, TValue> & { frame: TableFrame }

export const TABLE_HEAD_CLASS =
  'h-7 whitespace-nowrap bg-muted text-center text-xs font-medium text-muted-foreground [&_button]:text-xs'

const TABLE_FOOT_CELL_CLASS = 'whitespace-nowrap bg-muted text-center font-semibold'

// The three boxes that differ between a grid and an in-flow table. Injected rather than
// branched on, so DataTableBase never asks which one it is rendering.
type TableFrame = {
  root: string
  border: string
  scrollRegion: string
  // Present when the frame keeps only the rows near the viewport in the DOM. Absent means
  // every row is rendered.
  //
  // rowHeight must match what a row actually measures: rows are placed by arithmetic, not
  // by measurement, so a wrong value drifts further out of true the deeper you scroll.
  // Every cell is whitespace-nowrap and single-line, which is what keeps that true.
  virtualRows?: { rowHeight: number; overscan: number }
  // A grid leads the toolbar with a result count unless the page carries the count itself.
  countsResults: boolean
}

// Rows are 29px: p-1 either side of a 13px line-height, plus a 1px bottom border.
const GRID_ROW_HEIGHT = 29
const GRID_OVERSCAN = 12

// Claims what its flex column has left and scrolls on both axes, so both scrollbars sit on
// the viewport edges. No side border or radius: the grid runs edge to edge.
const GRID_FRAME = {
  root: 'flex min-h-0 flex-1 flex-col',
  // -mt-px laps the top border over the bottom border of whatever sits above, so the two
  // hairlines read as one rather than stacking into a thick rule.
  border: '-mt-px flex min-h-0 flex-1 flex-col border-y',
  scrollRegion: 'flex-1 min-h-0 overflow-auto outline-none',
  virtualRows: { rowHeight: GRID_ROW_HEIGHT, overscan: GRID_OVERSCAN },
  countsResults: true,
} as const satisfies TableFrame

const UNCOUNTED_GRID_FRAME = {
  ...GRID_FRAME,
  countsResults: false,
} as const satisfies TableFrame

// Grows with its rows and scrolls horizontally only, for a table that sits inside a form.
const IN_FLOW_FRAME = {
  root: '',
  border: 'overflow-hidden rounded-md border',
  scrollRegion: 'overflow-x-auto outline-none',
  countsResults: false,
} as const satisfies TableFrame

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
const DROP_BEFORE_CLASS = 'shadow-[inset_2px_0_0_var(--color-foreground)]'
const DROP_AFTER_CLASS = 'shadow-[inset_-2px_0_0_var(--color-foreground)]'
// Raised above the sort toggle's stretched hit area, so a press on the grip starts a drag
// rather than a sort. Darkens with the label whenever the header is hovered. The padding
// widens the hit area and the matching negative margin keeps it out of the layout.
const GRIP_CLASS =
  'relative z-10 -mx-1 -my-1.5 shrink-0 px-1 py-1.5 transition-colors ' +
  'cursor-grab active:cursor-grabbing ' +
  'group-hover/head:text-foreground focus-visible:text-foreground'
// The grip sits in flow a fixed gap before the label. The right padding mirrors the grip
// and that gap (a 14px icon + 10px) so the label stays centred over its data. Only the
// draggable headers carry a grip.
const GRIP_GROUP_CLASS = 'flex min-w-0 items-center justify-center gap-2.5 pr-6'
// Hugs its label, but its ::after stretches over the whole header cell, so the entire header
// still reads as the hit area. Reserves nothing for the arrow: the column is sized to its
// content, which the arrow joins once a sort is applied.
const SORT_TOGGLE_CLASS =
  'inline-flex min-w-0 max-w-full items-center justify-center gap-1 ' +
  'cursor-pointer select-none group-hover/head:text-foreground [&>svg]:shrink-0 ' +
  'after:absolute after:inset-0'
const HEADER_LABEL_CLASS = 'min-w-0 truncate'
const PLAIN_HEADER_LABEL_CLASS = `block ${HEADER_LABEL_CLASS}`
// A table opens sized to its content. The first resize freezes every column at its rendered
// width and switches to fixed layout, where the header row alone decides the widths, so the
// body rows never re-render for a drag. Cells then truncate rather than push a column open.
const AUTO_LAYOUT_TABLE_CLASS = 'table-auto w-max min-w-full'
const FIXED_LAYOUT_TABLE_CLASS =
  'table-fixed min-w-full [&_th]:overflow-hidden [&_td]:overflow-hidden [&_td]:text-ellipsis'
const MIN_COLUMN_WIDTH = 48
const COLUMN_ID_ATTRIBUTE = 'data-column-id'
// A wide hit area around a 1px rule drawn in the pinned edge's colour on the cell's right
// edge. The rule takes the hovered header text's colour while pointed at or dragged.
const RESIZE_HANDLE_CLASS =
  'absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none ' +
  'after:absolute after:inset-y-0 after:right-0 after:transition-colors'
const RESTING_HANDLE_CLASS =
  'after:w-px after:bg-border hover:after:w-0.5 hover:after:bg-foreground'
const RESIZING_HANDLE_CLASS = 'after:w-0.5 after:bg-foreground'
const DRAG_CHIP_CLASS =
  'flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium shadow-md'

// Spread over a base style: contributes nothing unless the column is pinned, so the
// caller supplies the z-index that a pinned cell needs to win over its own layer.
function pinnedLeftStyle<TData>(column: Column<TData>, zIndex: number): CSSProperties {
  if (column.getIsPinned() !== 'left') return {}
  return { position: 'sticky', left: `var(${pinStartProperty(column.id)})`, zIndex }
}

function pinStartProperty(columnId: string): string {
  return `--pin-start-${columnId}`
}

// Published on the table rather than read per cell, so a resize moves the pinned body cells
// without re-rendering the memoized rows that hold them.
function pinStartProperties<TData>(table: ReactTableInstance<TData>): CSSProperties {
  const properties: Record<string, string> = {}
  for (const column of table.getLeftLeafColumns()) {
    properties[pinStartProperty(column.id)] = `${column.getStart('left')}px`
  }
  return properties as CSSProperties
}

function headerCellsOf(table: HTMLTableElement): HTMLElement[] {
  return Array.from(table.querySelectorAll<HTMLElement>(`thead th[${COLUMN_ID_ATTRIBUTE}]`))
}

function measureRenderedWidths(table: HTMLTableElement): ColumnSizingState {
  const widths: ColumnSizingState = {}
  for (const headerCell of headerCellsOf(table)) {
    const columnId = headerCell.getAttribute(COLUMN_ID_ATTRIBUTE)
    if (columnId) widths[columnId] = headerCell.getBoundingClientRect().width
  }
  return widths
}

// The width each column would take if the table were still sized to its content, over the
// rows currently in the DOM. The table drops back to auto layout for one synchronous reflow
// and is restored before the browser can paint, so nothing flashes.
function measureContentWidths(
  table: HTMLTableElement,
  columnIds: readonly string[],
): ColumnSizingState {
  const targetCells = headerCellsOf(table).filter((headerCell) =>
    columnIds.includes(headerCell.getAttribute(COLUMN_ID_ATTRIBUTE) ?? ''),
  )
  const prevTableStyle = table.style.cssText
  const prevCellStyles = targetCells.map((headerCell) => headerCell.style.cssText)
  table.style.tableLayout = 'auto'
  table.style.width = 'max-content'
  table.style.minWidth = '0'
  for (const headerCell of targetCells) headerCell.style.width = ''
  const widths: ColumnSizingState = {}
  for (const headerCell of targetCells) {
    const columnId = headerCell.getAttribute(COLUMN_ID_ATTRIBUTE) ?? ''
    widths[columnId] = Math.max(MIN_COLUMN_WIDTH, headerCell.getBoundingClientRect().width)
  }
  table.style.cssText = prevTableStyle
  targetCells.forEach((headerCell, index) => {
    headerCell.style.cssText = prevCellStyles[index]
  })
  return widths
}

// Every rendered header carries a width once frozen, so an empty map means content sizing.
function isFrozen(columnSizing: ColumnSizingState): boolean {
  return Object.keys(columnSizing).length > 0
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

function headerCellStyle<TData>(header: Header<TData, unknown>, frozen: boolean): CSSProperties {
  return {
    width: frozen ? header.getSize() : header.column.columnDef.size,
    position: 'sticky',
    top: 0,
    zIndex: HEADER_Z_INDEX,
    ...pinnedLeftStyle(header.column, PINNED_HEADER_Z_INDEX),
  }
}

function headerCellClassName<TData>(header: Header<TData, unknown>): string {
  const meta = header.column.columnDef.meta
  return `${TABLE_HEAD_CLASS} ${pinEdgeClass(header.column)} ${meta?.cellClassName ?? ''} ${meta?.headerClassName ?? ''}`
}

// Nothing marks a column as sortable at rest: every column is, so a hint on each one would
// be noise. The arrow appears only once a sort is applied, and names its direction.
function SortDirectionIcon({ direction }: { direction: SortDirection }): React.JSX.Element {
  if (direction === 'asc') return <ArrowUpIcon aria-hidden="true" />
  return <ArrowDownIcon aria-hidden="true" />
}

function SortToggle<TData>({ header }: { header: Header<TData, unknown> }): React.JSX.Element {
  const { column } = header
  const direction = column.getIsSorted()
  return (
    <button
      type="button"
      className={SORT_TOGGLE_CLASS}
      onClick={() => column.toggleSorting(direction === 'asc')}
    >
      <span className={HEADER_LABEL_CLASS} onPointerEnter={titleWhenTruncated}>
        {flexRender(column.columnDef.header, header.getContext())}
      </span>
      {direction && <SortDirectionIcon direction={direction} />}
    </button>
  )
}

// A label cut short by a narrowed column names itself in full on hover; one that fits gets
// no title, so it never repeats what is already on screen.
function titleWhenTruncated(event: React.PointerEvent<HTMLElement>) {
  const label = event.currentTarget
  label.title = label.scrollWidth > label.clientWidth ? label.innerText : ''
}

function headerContent<TData>(header: Header<TData, unknown>): React.ReactNode {
  if (header.isPlaceholder) return null
  if (!header.column.getCanSort()) {
    return (
      <span className={PLAIN_HEADER_LABEL_CLASS} onPointerEnter={titleWhenTruncated}>
        {flexRender(header.column.columnDef.header, header.getContext())}
      </span>
    )
  }
  return <SortToggle header={header} />
}

function ariaSort<TData>(column: Column<TData>): 'ascending' | 'descending' | undefined {
  const direction = column.getIsSorted()
  if (direction === 'asc') return 'ascending'
  if (direction === 'desc') return 'descending'
  return undefined
}

type HeaderCellProps<TData> = {
  header: Header<TData, unknown>
  frozen: boolean
  resizeHandle: React.ReactNode
}

function HeaderCell<TData>(props: HeaderCellProps<TData>): React.JSX.Element {
  if (!isReorderable(props.header.column)) return <StaticHeaderCell {...props} />
  return <SortableHeaderCell {...props} />
}

function StaticHeaderCell<TData>({
  header,
  frozen,
  resizeHandle,
}: HeaderCellProps<TData>): React.JSX.Element {
  return (
    <TableHead
      data-column-id={header.column.id}
      aria-sort={ariaSort(header.column)}
      style={headerCellStyle(header, frozen)}
      className={`group/head ${headerCellClassName(header)}`}
    >
      {headerContent(header)}
      {resizeHandle}
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
  frozen,
  resizeHandle,
}: HeaderCellProps<TData>): React.JSX.Element {
  // The transform this returns is deliberately unused: shifting a header without shifting
  // the thousands of body cells below it would tear the column apart mid-drag.
  const { activeIndex, attributes, index, isDragging, isOver, listeners, setNodeRef } = useSortable(
    { id: header.column.id },
  )
  return (
    <TableHead
      ref={setNodeRef}
      data-column-id={header.column.id}
      aria-sort={ariaSort(header.column)}
      style={headerCellStyle(header, frozen)}
      className={`group/head relative ${headerCellClassName(header)} ${isDragging ? DRAGGING_HEAD_CLASS : ''} ${dropIndicatorClass(isOver, activeIndex, index)}`}
    >
      <div className={GRIP_GROUP_CLASS}>
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
      </div>
      {resizeHandle}
    </TableHead>
  )
}

// Pointer-only: the handle adds no tab stop, and a truncated label stays readable through its
// title. A double-click fits the column to the rows currently rendered.
function ColumnResizeHandle({
  resizing,
  onResizeStart,
  onAutoFit,
}: {
  resizing: boolean
  onResizeStart: (event: React.MouseEvent | React.TouchEvent) => void
  onAutoFit: () => void
}): React.JSX.Element {
  return (
    <div
      data-slot="column-resize-handle"
      aria-hidden="true"
      className={`${RESIZE_HANDLE_CLASS} ${resizing ? RESIZING_HANDLE_CLASS : RESTING_HANDLE_CLASS}`}
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
      onDoubleClick={onAutoFit}
    />
  )
}

// Soaks up whatever width the frozen columns leave, so the header band and row hover still
// run to the edge of the grid.
function FillerHeaderCell(): React.JSX.Element {
  return (
    <TableHead
      aria-hidden="true"
      style={{ position: 'sticky', top: 0, zIndex: HEADER_Z_INDEX }}
      className={TABLE_HEAD_CLASS}
    />
  )
}

// Stands in for the rows outside the window so the scrollbar spans the whole result set.
// Borderless and padding-free, so it never reads as a row.
function SpacerRow({ height }: { height: number }): React.JSX.Element {
  return (
    <tr aria-hidden="true">
      <td style={{ height, padding: 0, border: 0 }} />
    </tr>
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

function DataTableBase<TData, TValue>({
  frame,
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
  renderToolbar,
  renderAboveTable,
  facetedRowModels,
  textSearch,
  meta,
}: DataTableBaseProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    defaultSort ? [defaultSort] : [],
  )
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [internalColumnOrder, setInternalColumnOrder] = useState<ColumnOrderState>([])
  const [draggedColumnLabel, setDraggedColumnLabel] = useState('')
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const scrollRegionRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const { pathname } = useLocation()

  const rowSelection = controlledRowSelection ?? internalRowSelection
  const onRowSelectionChange = onControlledRowSelectionChange ?? setInternalRowSelection
  const sorting = controlledSorting ?? internalSorting
  const onSortingChange = onControlledSortingChange ?? setInternalSorting
  const columnOrder = controlledColumnOrder ?? internalColumnOrder
  const onColumnOrderChange = onControlledColumnOrderChange ?? setInternalColumnOrder

  const columnPinning = useMemo<ColumnPinningState>(
    () => ({ left: pinLeft ?? [], right: [] }),
    [pinLeft],
  )

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
    defaultColumn: { size: undefined, minSize: MIN_COLUMN_WIDTH },
    columnResizeMode: 'onChange',
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange,
    onColumnOrderChange,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    ...facetedRowModels,
    ...textSearch,
    meta,
    enableRowSelection: true,
    onRowSelectionChange,
    getRowId,
    getSubRows,
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      globalFilter,
      columnVisibility,
      columnOrder,
      columnPinning,
      columnSizing,
      expanded,
    },
  })

  const hasFooter = table
    .getVisibleLeafColumns()
    .some((column) => column.columnDef.footer !== undefined)

  // A grid holds only the rows near the viewport, so sorting or toggling a column re-renders
  // a screenful rather than every row the reader has scrolled past.
  const virtualRows = frame.virtualRows
  const rows = table.getRowModel().rows
  // Names this region on this path, so returning to the list by any route puts the reader back
  // where they were. Absent for a frame that grows with its rows, which has nothing to scroll
  // back to.
  const scrollKey = virtualRows ? `${pathname}|${label}` : null
  const { initialOffset } = useGridScrollRestoration(scrollRegionRef, scrollKey, rows.length)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRegionRef.current,
    estimateSize: () => virtualRows?.rowHeight ?? GRID_ROW_HEIGHT,
    overscan: virtualRows?.overscan ?? 0,
    initialOffset,
    enabled: Boolean(virtualRows),
  })

  const virtualItems = rowVirtualizer.getVirtualItems()
  const windowedRows = virtualRows
    ? virtualItems.map((item) => ({ row: rows[item.index], rowPosition: item.index }))
    : rows.map((row, rowPosition) => ({ row, rowPosition }))
  // Spacer rows stand in for everything outside the window, so the scrollbar spans the whole
  // result set and the rendered rows stay in normal table flow.
  const firstItem = virtualItems[0]
  const lastItem = virtualItems[virtualItems.length - 1]
  const paddingTop = firstItem ? firstItem.start : 0
  const paddingBottom = lastItem ? rowVirtualizer.getTotalSize() - lastItem.end : 0

  const frozen = isFrozen(columnSizing)
  const visibleColumnIds = table
    .getVisibleLeafColumns()
    .map((column) => column.id)
    .join(',')

  // A column shown after the freeze has no measured width yet. It is fitted to its content
  // before paint, so it arrives at the width it would have had. A column hidden and shown
  // again keeps the width it left with.
  useLayoutEffect(() => {
    const tableElement = tableRef.current
    if (!frozen || !tableElement) return
    const unsizedIds = visibleColumnIds.split(',').filter((id) => !(id in columnSizing))
    if (unsizedIds.length === 0) return
    const widths = measureContentWidths(tableElement, unsizedIds)
    setColumnSizing((prevSizing) => ({ ...prevSizing, ...widths }))
  }, [frozen, visibleColumnIds, columnSizing])

  // Commits synchronously: the resize handler reads the column's start width the moment the
  // drag begins, and would read the unfrozen default if the snapshot were still pending.
  function freezeColumnWidths() {
    const tableElement = tableRef.current
    if (frozen || !tableElement) return
    const renderedWidths = measureRenderedWidths(tableElement)
    flushSync(() => setColumnSizing(renderedWidths))
  }

  function startColumnResize(
    header: Header<TData, unknown>,
    event: React.MouseEvent | React.TouchEvent,
  ) {
    freezeColumnWidths()
    header.getResizeHandler()(event)
  }

  function autoFitColumn(columnId: string) {
    freezeColumnWidths()
    const tableElement = tableRef.current
    if (!tableElement) return
    const widths = measureContentWidths(tableElement, [columnId])
    setColumnSizing((prevSizing) => ({ ...prevSizing, ...widths }))
  }

  function resizeHandleFor(header: Header<TData, unknown>): React.ReactNode {
    if (!header.column.getCanResize()) return null
    return (
      <ColumnResizeHandle
        resizing={header.column.getIsResizing()}
        onResizeStart={(event) => startColumnResize(header, event)}
        onAutoFit={() => autoFitColumn(header.column.id)}
      />
    )
  }

  const tableClassName = frozen ? FIXED_LAYOUT_TABLE_CLASS : AUTO_LAYOUT_TABLE_CLASS
  const tableStyle: CSSProperties = {
    ...pinStartProperties(table),
    width: frozen ? table.getTotalSize() : undefined,
  }

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
    <div className={frame.root}>
      {renderAboveTable && <div className="shrink-0">{renderAboveTable(table)}</div>}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggedColumnLabel('')}
      >
        <SortableContext items={reorderableColumnIds} strategy={horizontalListSortingStrategy}>
          <div className={`${frame.border} ${SCROLL_REGION_FOCUS_CLASS}`}>
            {(frame.countsResults || renderToolbar) && (
              <TableToolbar>
                {renderToolbar?.(table)}
                {frame.countsResults && (
                  <TableToolbarEnd>
                    <TableResultCount table={table} />
                  </TableToolbarEnd>
                )}
              </TableToolbar>
            )}
            <div
              data-slot={SCROLL_REGION_SLOT}
              role="region"
              aria-label={label}
              ref={scrollRegionRef}
              tabIndex={0}
              className={frame.scrollRegion}
            >
              <Table
                ref={tableRef}
                aria-label={label}
                className={tableClassName}
                style={tableStyle}
              >
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <HeaderCell
                          key={header.id}
                          header={header}
                          frozen={frozen}
                          resizeHandle={resizeHandleFor(header)}
                        />
                      ))}
                      {frozen && <FillerHeaderCell />}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {paddingTop > 0 && <SpacerRow height={paddingTop} />}
                  {rows.length ? (
                    windowedRows.map(({ row, rowPosition }) => (
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
                        hasFillerCell={frozen}
                      />
                    ))
                  ) : (
                    <TableRow role="status" aria-live="polite">
                      <TableCell
                        colSpan={table.getVisibleLeafColumns().length + (frozen ? 1 : 0)}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                  {paddingBottom > 0 && <SpacerRow height={paddingBottom} />}
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
                        {frozen && (
                          <TableCell aria-hidden="true" className={TABLE_FOOT_CELL_CLASS} />
                        )}
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
    </div>
  )
}

// Fills the space its parent gives it and owns both scrollbars, so the horizontal scrollbar
// sits at the bottom of the viewport instead of below the last row. For list and report pages.
export function DataGrid<TData, TValue>(props: DataTableProps<TData, TValue>) {
  return <DataTableBase {...props} frame={GRID_FRAME} />
}

// A DataGrid for a page whose own filter controls already show how many rows each one yields.
export function DataGridWithoutResultCount<TData, TValue>(props: DataTableProps<TData, TValue>) {
  return <DataTableBase {...props} frame={UNCOUNTED_GRID_FRAME} />
}

// Lays out in flow and grows with its rows, for a table that sits inside a form under a
// field set, where claiming the rest of the viewport would strand the fields above it.
export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  return <DataTableBase {...props} frame={IN_FLOW_FRAME} />
}

function DataRowImpl<TData>({
  row,
  // Sorting reorders the same Row instances, so without the visual position in
  // the props this memo never busts on a reorder — which strands anything a cell derives from
  // its position, such as an editable grid's single keyboard entry point.
  rowPosition,
  cells,
  isSelected,
  isExpanded,
  onRowMouseEnter,
  getRowHref,
  getRowClassName,
  hasFillerCell,
}: {
  row: Row<TData>
  rowPosition: number
  cells: Cell<TData, unknown>[]
  hasFillerCell: boolean
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
      {hasFillerCell && <TableCell aria-hidden="true" className={CELL_BG} />}
    </TableRow>
  )
}

const DataRow = memo(DataRowImpl) as typeof DataRowImpl

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role=checkbox]'

function hasTextSelection(): boolean {
  const selection = window.getSelection()
  return selection !== null && selection.toString().length > 0
}
