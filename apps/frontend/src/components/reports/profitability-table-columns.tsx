import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { MonthRow, ProfitabilityMetrics } from '@/lib/profitability-aggregate'
import { cn } from '@/lib/utils'
import type { ColumnDef } from '@tanstack/react-table'
import { endOfMonth, endOfYear } from 'date-fns'
import { Link } from 'react-router-dom'
import { MAX_DEPARTED_WINDOW_MONTHS } from 'shared-types'

const NO_VALUE = '—'
const MONTH_HEADER = 'Month'
const TOTAL_LABEL = 'Total'
const OUT_OF_WINDOW_MESSAGE = `Asset details are only kept for the last ${MAX_DEPARTED_WINDOW_MONTHS} months`
const MARGIN_PCT_HEADER = 'Margin %'
const MARGIN_PCT_FRACTION_DIGITS = 1
export const NEGATIVE_CLASS = 'text-destructive'
const MONTH_CELL_CLASS = 'text-left font-medium'
const METRIC_CELL_CLASS = 'text-right tabular-nums'

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const METRIC_COLUMNS = [
  { key: 'asset_count', header: 'Assets', format: 'count', highlightNegative: false },
  { key: 'gross_revenue', header: 'Gross Revenue', format: 'money', highlightNegative: false },
  { key: 'cogs', header: 'COGS', format: 'money', highlightNegative: false },
  { key: 'gross_margin', header: 'Gross Margin', format: 'money', highlightNegative: true },
] as const satisfies readonly {
  key: keyof ProfitabilityMetrics
  header: string
  format: 'money' | 'count'
  highlightNegative: boolean
}[]

type RangeHrefBuilder = (from: Date, to: Date) => string | null

function formatMetric(value: number, format: 'money' | 'count'): string {
  if (format === 'count') return String(value)
  return formatUSDWithSymbol(value)
}

export function formatMarginPct(grossRevenue: number, grossMargin: number): string {
  if (grossRevenue === 0) return NO_VALUE
  const pct = (grossMargin / grossRevenue) * 100
  return `${pct.toFixed(MARGIN_PCT_FRACTION_DIGITS)}%`
}

function UnreachableRange({ label }: { label: string }): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-muted-foreground">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{OUT_OF_WINDOW_MESSAGE}</TooltipContent>
    </Tooltip>
  )
}

function RangeLink({ href, label }: { href: string | null; label: string }): React.JSX.Element {
  if (href === null) return <UnreachableRange label={label} />
  return (
    <Link to={href} className="hover:underline">
      {label}
    </Link>
  )
}

function MetricValue({
  value,
  format,
  negative,
}: {
  value: number
  format: 'money' | 'count'
  negative: boolean
}): React.JSX.Element {
  return <span className={cn(negative && NEGATIVE_CLASS)}>{formatMetric(value, format)}</span>
}

function MarginPctValue({ metrics }: { metrics: ProfitabilityMetrics }): React.JSX.Element {
  return (
    <span className={cn(metrics.gross_margin < 0 && NEGATIVE_CLASS)}>
      {formatMarginPct(metrics.gross_revenue, metrics.gross_margin)}
    </span>
  )
}

export function createProfitabilityColumns({
  year,
  totals,
  getRangeHref,
}: {
  year: number
  totals: ProfitabilityMetrics
  getRangeHref: RangeHrefBuilder
}): ColumnDef<MonthRow>[] {
  const yearStart = new Date(year, 0, 1)

  return [
    {
      id: 'month',
      header: MONTH_HEADER,
      enableSorting: false,
      meta: { cellClassName: MONTH_CELL_CLASS },
      cell: ({ row }) => {
        const monthStart = new Date(year, row.original.month - 1, 1)
        return (
          <RangeLink
            href={getRangeHref(monthStart, endOfMonth(monthStart))}
            label={MONTH_LABELS[row.original.month - 1]}
          />
        )
      },
      footer: () => (
        <RangeLink href={getRangeHref(yearStart, endOfYear(yearStart))} label={TOTAL_LABEL} />
      ),
    },
    ...METRIC_COLUMNS.map<ColumnDef<MonthRow>>((column) => ({
      id: column.key,
      header: column.header,
      enableSorting: false,
      meta: { cellClassName: METRIC_CELL_CLASS },
      cell: ({ row }) => (
        <MetricValue
          value={row.original[column.key]}
          format={column.format}
          negative={column.highlightNegative && row.original[column.key] < 0}
        />
      ),
      footer: () => (
        <MetricValue
          value={totals[column.key]}
          format={column.format}
          negative={column.highlightNegative && totals[column.key] < 0}
        />
      ),
    })),
    {
      id: 'margin_pct',
      header: MARGIN_PCT_HEADER,
      enableSorting: false,
      meta: { cellClassName: METRIC_CELL_CLASS },
      cell: ({ row }) => <MarginPctValue metrics={row.original} />,
      footer: () => <MarginPctValue metrics={totals} />,
    },
  ]
}
