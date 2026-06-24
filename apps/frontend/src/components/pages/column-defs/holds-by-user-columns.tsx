import type { SalespersonHoldsGroup } from '@/lib/holds-by-user-aggregate'
import { formatTitleCase } from '@/lib/formatters'
import { buildSearchHeldUrl } from '@/lib/search-held-params'
import { cn } from '@/lib/utils'
import { CaretRightIcon } from '@phosphor-icons/react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

const DAYS_SUFFIX = 'd'
const INDENT_PER_DEPTH_REM = 2.5

export type HoldsReportRow = {
  rowId: string
  label: string
  assetCount: number
  holdCount: number
  medianHeldDays: number
  href: string
  subRows?: HoldsReportRow[]
}

export function toHoldsReportRows(salespeople: SalespersonHoldsGroup[]): HoldsReportRow[] {
  return salespeople.map((rep) => ({
    rowId: `rep-${rep.salesRepId}`,
    label: rep.salesRepName,
    assetCount: rep.assetCount,
    holdCount: rep.holdCount,
    medianHeldDays: rep.medianHeldDays,
    href: buildSearchHeldUrl({ heldForId: rep.salesRepId }),
    subRows: rep.customers.map((customer) => ({
      rowId: `rep-${rep.salesRepId}-customer-${customer.customerId}`,
      label: formatTitleCase(customer.customerName),
      assetCount: customer.assetCount,
      holdCount: customer.holdCount,
      medianHeldDays: customer.medianHeldDays,
      href: buildSearchHeldUrl({
        heldForId: rep.salesRepId,
        holdCustomerId: customer.customerId,
      }),
    })),
  }))
}

function formatDays(value: number): string {
  return `${Math.round(value)}${DAYS_SUFFIX}`
}

function LabelCell({ row }: { row: Row<HoldsReportRow> }): React.JSX.Element {
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

export const HOLDS_BY_USER_COLUMNS: ColumnDef<HoldsReportRow>[] = [
  {
    id: 'label',
    header: 'Salesperson / Customer',
    cell: ({ row }) => <LabelCell row={row} />,
    size: 300,
    meta: { cellClassName: 'text-left' },
  },
  {
    id: 'assetCount',
    header: 'Assets',
    cell: ({ row }) => row.original.assetCount,
    size: 80,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    id: 'holdCount',
    header: 'Holds',
    cell: ({ row }) => row.original.holdCount,
    size: 80,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    id: 'medianHeldDays',
    header: 'Median Held Days',
    cell: ({ row }) => formatDays(row.original.medianHeldDays),
    size: 140,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
]
