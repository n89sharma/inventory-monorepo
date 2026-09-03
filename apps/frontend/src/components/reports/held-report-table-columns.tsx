import type { SalespersonHoldsGroup } from '@/lib/held-report-aggregate'
import { buildSearchOnHandUrl } from '@/lib/filters/serializers'
import { cn } from '@/lib/utils'
import { CaretRightIcon } from '@phosphor-icons/react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

const DAYS_SUFFIX = 'd'
const INDENT_PER_DEPTH_REM = 2.5
const MAX_HELD_WARNING_THRESHOLD = 30
const ROW_WARNING_CLASS = 'data-row-warning'

export type HeldReportTableRow = {
  rowId: string
  label: string
  assetCount: number
  holdCount: number
  maxHeldDays: number
  href: string
  subRows?: HeldReportTableRow[]
}

export function toHeldReportTableRows(salespeople: SalespersonHoldsGroup[]): HeldReportTableRow[] {
  return salespeople.map((rep) => ({
    rowId: `rep-${rep.salesRepId}`,
    label: rep.salesRepName,
    assetCount: rep.assetCount,
    holdCount: rep.holdCount,
    maxHeldDays: rep.maxHeldDays,
    href: buildSearchOnHandUrl({ heldForId: rep.salesRepId }),
    subRows: rep.customers.map((customer) => ({
      rowId: `rep-${rep.salesRepId}-customer-${customer.customerId}`,
      label: customer.customerName,
      assetCount: customer.assetCount,
      holdCount: customer.holdCount,
      maxHeldDays: customer.maxHeldDays,
      href: buildSearchOnHandUrl({
        heldForId: rep.salesRepId,
        holdCustomerId: customer.customerId,
      }),
    })),
  }))
}

export function getHeldReportRowId(row: HeldReportTableRow): string {
  return row.rowId
}

export function getHeldReportSubRows(row: HeldReportTableRow): HeldReportTableRow[] | undefined {
  return row.subRows
}

export function getHeldReportRowClassName(row: HeldReportTableRow): string | undefined {
  if (row.maxHeldDays > MAX_HELD_WARNING_THRESHOLD) return ROW_WARNING_CLASS
  return undefined
}

function formatDays(value: number): string {
  return `${Math.round(value)}${DAYS_SUFFIX}`
}

function LabelCell({ row }: { row: Row<HeldReportTableRow> }): React.JSX.Element {
  return (
    <div
      className="flex min-w-0 items-center gap-1"
      style={{ paddingLeft: `${row.depth * INDENT_PER_DEPTH_REM}rem` }}
    >
      {row.getCanExpand() ? (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
          aria-expanded={row.getIsExpanded()}
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        >
          <CaretRightIcon
            className={cn('transition-transform', row.getIsExpanded() && 'rotate-90')}
            aria-hidden="true"
          />
        </button>
      ) : null}
      <Link
        to={row.original.href}
        className={cn('truncate hover:underline', row.depth === 0 && 'font-medium')}
      >
        {row.original.label}
      </Link>
    </div>
  )
}

export const HELD_REPORT_COLUMNS: ColumnDef<HeldReportTableRow>[] = [
  {
    id: 'label',
    header: 'Salesperson / Customer',
    cell: ({ row }) => <LabelCell row={row} />,
    meta: { cellClassName: 'text-left' },
  },
  {
    id: 'assetCount',
    header: 'Assets',
    cell: ({ row }) => row.original.assetCount,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    id: 'holdCount',
    header: 'Holds',
    cell: ({ row }) => row.original.holdCount,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    id: 'maxHeldDays',
    header: 'Max Held Days',
    cell: ({ row }) => formatDays(row.original.maxHeldDays),
    meta: { cellClassName: 'text-center tabular-nums' },
  },
]
