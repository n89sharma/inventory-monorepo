import { MetricCard } from '@/components/custom/cards/metric-card'
import { SavedViewsButton } from '@/components/custom/saved-views-button'
import { SearchSelectInput } from '@/components/custom/search-select-input'
import { ShareButton } from '@/components/custom/share-button'
import { StickyPageHeader } from '@/components/custom/sticky-page-header'
import { PageContent } from '@/components/layout/page-content'
import { Button } from '@/components/shadcn/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { useProfitabilityReport } from '@/hooks/use-profitability-report'
import {
  aggregateCube,
  deriveFilterOptions,
  type DimensionOption,
  type MonthRow,
  type ProfitabilityMetrics,
  type ProfitabilityTable,
} from '@/lib/profitability-aggregate'
import {
  filtersToParams,
  NONE_FILTER,
  paramsToFilters,
  type DimensionValue,
  type ProfitabilityFilters,
} from '@/lib/profitability-report-url-params'
import { formatUSD } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ProfitabilityCubeRow } from 'shared-types'

const YEARS_IN_DROPDOWN = 5
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: YEARS_IN_DROPDOWN }, (_, i) => CURRENT_YEAR - i)

const ALL_VALUE = 'all'

const NO_VALUE = '—'
const MARGIN_PCT_HEADER = 'Margin %'
const MARGIN_PCT_FRACTION_DIGITS = 1
const NEGATIVE_CLASS = 'text-destructive'

const STICKY_HEADER_CLASS =
  'sticky top-[calc(var(--app-header-height,0px)+var(--details-header-height,0px))] bg-background z-10'
const STICKY_FOOTER_CLASS = 'sticky bottom-0 bg-muted z-10'

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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

const EMPTY_CUBE: ProfitabilityCubeRow[] = []

function formatMoney(value: number): string {
  const magnitude = formatUSD(Math.abs(value))
  return value < 0 ? `-$${magnitude}` : `$${magnitude}`
}

function formatMetric(value: number, format: 'money' | 'count'): string {
  if (format === 'count') return String(value)
  return formatMoney(value)
}

function formatMarginPct(grossRevenue: number, grossMargin: number): string {
  if (grossRevenue === 0) return NO_VALUE
  const pct = (grossMargin / grossRevenue) * 100
  return `${pct.toFixed(MARGIN_PCT_FRACTION_DIGITS)}%`
}

function monthHasActivity(row: MonthRow): boolean {
  return row.asset_count > 0 || row.gross_revenue !== 0 || row.gross_margin !== 0
}

function countActiveFilters(filters: ProfitabilityFilters): number {
  let count = 0
  if (filters.warehouseId !== null) count += 1
  if (filters.salesRepId !== null) count += 1
  if (filters.vendorId !== null) count += 1
  if (filters.brandId !== null) count += 1
  return count
}

function dimensionToSelectValue(value: DimensionValue): string {
  if (value === null) return ALL_VALUE
  if (value === NONE_FILTER) return NONE_FILTER
  return String(value)
}

function selectValueToDimension(raw: string): DimensionValue {
  if (raw === ALL_VALUE) return null
  if (raw === NONE_FILTER) return NONE_FILTER
  return Number.parseInt(raw, 10)
}

function DimensionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: DimensionValue
  options: DimensionOption[]
  onChange: (next: DimensionValue) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select
        value={dimensionToSelectValue(value)}
        onValueChange={raw => onChange(selectValueToDimension(raw))}
      >
        <SelectTrigger className="w-45">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            <SelectItem value={ALL_VALUE}>All</SelectItem>
            {options.map(option => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

function DimensionSearch({
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  label: string
  placeholder: string
  value: DimensionValue
  options: DimensionOption[]
  onChange: (next: DimensionValue) => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const selection = value === null
    ? null
    : options.find(option => option.value === value) ?? null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <SearchSelectInput
        selection={selection}
        query={query}
        onSelectionChange={option => { setQuery(''); onChange(option.value) }}
        onQueryChange={setQuery}
        onClear={() => { setQuery(''); onChange(null) }}
        options={options}
        getLabel={option => option.label}
        placeholder={placeholder}
        clearLabel={`Clear ${label.toLowerCase()}`}
        className="w-45"
      />
    </div>
  )
}

function ProfitabilityFilterBar({
  filters,
  options,
  onChange,
}: {
  filters: ProfitabilityFilters
  options: ReturnType<typeof deriveFilterOptions>
  onChange: (next: ProfitabilityFilters) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-row flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Year</span>
        <Select
          value={String(filters.year)}
          onValueChange={raw => onChange({ ...filters, year: Number.parseInt(raw, 10) })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              {YEARS.map(year => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <DimensionSelect
        label="Warehouse"
        value={filters.warehouseId}
        options={options.warehouses}
        onChange={next => onChange({ ...filters, warehouseId: next === NONE_FILTER ? null : next })}
      />
      <DimensionSelect
        label="Salesperson"
        value={filters.salesRepId}
        options={options.salespeople}
        onChange={next => onChange({ ...filters, salesRepId: next })}
      />
      <DimensionSearch
        label="Vendor"
        placeholder="All vendors"
        value={filters.vendorId}
        options={options.vendors}
        onChange={next => onChange({ ...filters, vendorId: next })}
      />
      <DimensionSearch
        label="Brand"
        placeholder="All brands"
        value={filters.brandId}
        options={options.brands}
        onChange={next => onChange({ ...filters, brandId: next === NONE_FILTER ? null : next })}
      />
    </div>
  )
}

function ActiveFilterBar({
  count,
  onClear,
}: {
  count: number
  onClear: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {count} {count === 1 ? 'filter' : 'filters'} active
      </span>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={onClear}
      >
        Clear all
      </Button>
    </div>
  )
}

function ProfitabilitySummaryCards({
  totals,
}: {
  totals: ProfitabilityMetrics
}): React.JSX.Element {
  const marginClass = totals.gross_margin < 0 ? NEGATIVE_CLASS : undefined
  return (
    <div className="flex flex-wrap gap-3">
      <MetricCard label="Gross Revenue" value={formatMoney(totals.gross_revenue)} />
      <MetricCard
        label="Gross Margin"
        value={formatMoney(totals.gross_margin)}
        valueClassName={marginClass}
      />
      <MetricCard
        label="Margin %"
        value={formatMarginPct(totals.gross_revenue, totals.gross_margin)}
        valueClassName={marginClass}
      />
    </div>
  )
}

function ProfitabilityTable({ table }: { table: ProfitabilityTable }): React.JSX.Element {
  const months = table.months.filter(monthHasActivity)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={STICKY_HEADER_CLASS}>Month</TableHead>
          {METRIC_COLUMNS.map(column => (
            <TableHead key={column.key} className={cn('text-right', STICKY_HEADER_CLASS)}>
              {column.header}
            </TableHead>
          ))}
          <TableHead className={cn('text-right', STICKY_HEADER_CLASS)}>
            {MARGIN_PCT_HEADER}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {months.map(row => (
          <TableRow key={row.month}>
            <TableCell className="font-medium">{MONTH_LABELS[row.month - 1]}</TableCell>
            {METRIC_COLUMNS.map(column => (
              <TableCell
                key={column.key}
                className={cn(
                  'text-right tabular-nums',
                  column.highlightNegative && row[column.key] < 0 && NEGATIVE_CLASS,
                )}
              >
                {formatMetric(row[column.key], column.format)}
              </TableCell>
            ))}
            <TableCell
              className={cn('text-right tabular-nums', row.gross_margin < 0 && NEGATIVE_CLASS)}
            >
              {formatMarginPct(row.gross_revenue, row.gross_margin)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className={cn('font-semibold', STICKY_FOOTER_CLASS)}>Total</TableCell>
          {METRIC_COLUMNS.map(column => (
            <TableCell
              key={column.key}
              className={cn(
                'text-right font-semibold tabular-nums',
                STICKY_FOOTER_CLASS,
                column.highlightNegative && table.totals[column.key] < 0 && NEGATIVE_CLASS,
              )}
            >
              {formatMetric(table.totals[column.key], column.format)}
            </TableCell>
          ))}
          <TableCell
            className={cn(
              'text-right font-semibold tabular-nums',
              STICKY_FOOTER_CLASS,
              table.totals.gross_margin < 0 && NEGATIVE_CLASS,
            )}
          >
            {formatMarginPct(table.totals.gross_revenue, table.totals.gross_margin)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}

function ProfitabilityReportBody({
  table,
  hasActiveFilters,
  onClearFilters,
}: {
  table: ProfitabilityTable
  hasActiveFilters: boolean
  onClearFilters: () => void
}): React.JSX.Element {
  if (!table.months.some(monthHasActivity)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">No activity for these filters.</p>
        {hasActiveFilters
          ? <Button variant="outline" size="sm" onClick={onClearFilters}>Clear filters</Button>
          : null}
      </div>
    )
  }
  return <ProfitabilityTable table={table} />
}

export function ProfitabilityReportPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(
    () => paramsToFilters(searchParams, CURRENT_YEAR),
    [searchParams],
  )

  const { data: cube = EMPTY_CUBE, isLoading } = useProfitabilityReport(filters.year)
  const options = useMemo(() => deriveFilterOptions(cube), [cube])
  const table = useMemo(() => aggregateCube(cube, filters), [cube, filters])

  const activeFilterCount = countActiveFilters(filters)

  function updateFilters(next: ProfitabilityFilters) {
    setSearchParams(filtersToParams(next), { replace: true })
  }

  function clearFilters() {
    updateFilters({
      year: filters.year,
      warehouseId: null,
      salesRepId: null,
      vendorId: null,
      brandId: null,
    })
  }

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Profitability</h1>
            {isLoading
              ? <SpinnerGapIcon
                  className="animate-spin text-muted-foreground"
                  aria-label="Loading"
                  role="status"
                />
              : null}
          </div>
          <div className="flex items-center gap-2">
            <SavedViewsButton pageKey="report_profitability" />
            <ShareButton />
          </div>
        </div>
        <ProfitabilityFilterBar filters={filters} options={options} onChange={updateFilters} />
        {activeFilterCount > 0
          ? <ActiveFilterBar count={activeFilterCount} onClear={clearFilters} />
          : null}
      </StickyPageHeader>
      <PageContent>
        <div className={cn('flex flex-col gap-4 transition-opacity', isLoading && 'opacity-50')}>
          <ProfitabilitySummaryCards totals={table.totals} />
          <ProfitabilityReportBody
            table={table}
            hasActiveFilters={activeFilterCount > 0}
            onClearFilters={clearFilters}
          />
        </div>
      </PageContent>
    </>
  )
}
