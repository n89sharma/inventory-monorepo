import { MetricCard } from '@/components/custom/cards/metric-card'
import { ShareButton } from '@/components/custom/share-button'
import { StickyPageHeader } from '@/components/custom/sticky-page-header'
import {
  HOLDS_BY_USER_COLUMNS,
  toHoldsReportRows,
  type HoldsReportRow,
} from '@/components/pages/column-defs/holds-by-user-columns'
import { PageContent } from '@/components/layout/page-content'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { useHoldsByUserReport } from '@/hooks/use-holds-by-user-report'
import { aggregateHolds, type HoldsByUserTable } from '@/lib/holds-by-user-aggregate'
import { cn } from '@/lib/utils'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ExpandedState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ActiveHoldRow } from 'shared-types'

const DAYS_SUFFIX = 'd'
const SEARCH_HELD_URL = '/search/held'
const INTERACTIVE_SELECTOR = 'a, button'
const MEDIAN_HELD_WARNING_THRESHOLD = 30
const ROW_WARNING_CLASS = 'bg-[var(--row-warning)] hover:bg-[var(--row-warning-hover)]'

const STICKY_HEADER_CLASS =
  'sticky top-[calc(var(--app-header-height,0px)+var(--details-header-height,0px))] bg-background z-10'

const EMPTY_ROWS: ActiveHoldRow[] = []

function formatDays(value: number): string {
  return `${Math.round(value)}${DAYS_SUFFIX}`
}

function HoldsSummaryCards({ totals }: { totals: HoldsByUserTable['totals'] }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-3">
      <MetricCard label="Assets Held" value={String(totals.assetCount)} />
      <MetricCard label="Total Holds" value={String(totals.holdCount)} />
      <MetricCard label="Salespeople with Holds" value={String(totals.salespersonCount)} />
      <MetricCard label="Median Held Days" value={formatDays(totals.medianHeldDays)} />
    </div>
  )
}

function HoldsReportTable({ rows }: { rows: HoldsReportRow[] }): React.JSX.Element {
  const [expanded, setExpanded] = useState<ExpandedState>({})

  const table = useReactTable({
    data: rows,
    columns: HOLDS_BY_USER_COLUMNS,
    state: { expanded },
    onExpandedChange: setExpanded,
    getRowId: (row) => row.rowId,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  return (
    <Table className="table-fixed" style={{ width: table.getCenterTotalSize() }}>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                style={{ width: header.getSize() }}
                className={cn(STICKY_HEADER_CLASS, header.column.columnDef.meta?.cellClassName)}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            className={cn(
              row.getCanExpand() && 'cursor-pointer',
              row.original.medianHeldDays > MEDIAN_HELD_WARNING_THRESHOLD && ROW_WARNING_CLASS,
            )}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return
              if (row.getCanExpand()) row.toggleExpanded()
            }}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                style={{ width: cell.column.getSize() }}
                className={cell.column.columnDef.meta?.cellClassName}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function HoldsReportBody({ table }: { table: HoldsByUserTable }): React.JSX.Element {
  const rows = useMemo(() => toHoldsReportRows(table.salespeople), [table.salespeople])

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">No active holds.</p>
        <Link to={SEARCH_HELD_URL} className="text-sm underline">
          Go to Search Held
        </Link>
      </div>
    )
  }

  return <HoldsReportTable rows={rows} />
}

export function HoldsByUserReportPage(): React.JSX.Element {
  const { data: rows = EMPTY_ROWS, isLoading } = useHoldsByUserReport()
  const table = useMemo(() => aggregateHolds(rows), [rows])

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Held Report</h1>
            {isLoading ? (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            ) : null}
          </div>
          <ShareButton />
        </div>
      </StickyPageHeader>
      <PageContent>
        <div className={cn('flex flex-col gap-4 transition-opacity', isLoading && 'opacity-50')}>
          <HoldsSummaryCards totals={table.totals} />
          <HoldsReportBody table={table} />
        </div>
      </PageContent>
    </>
  )
}
