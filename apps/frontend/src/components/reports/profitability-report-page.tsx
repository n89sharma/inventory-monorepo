import { PageContent } from '@/components/app-layout/page-content'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { CustomerFilter } from '@/components/shared/filters/customer-filter'
import { UserFilter } from '@/components/shared/filters/user-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
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
import { ActiveFilterBar } from '@/components/shared/active-filter-bar'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { MetricCard } from './metric-card'
import { SavedViewsButton } from '@/components/shared/saved-views-button'
import { ShareButton } from '@/components/shared/share-button'
import { useProfitabilityReport } from '@/hooks/use-profitability-report'
import {
  useBrandParam,
  useSalespersonParam,
  useVendorParam,
  useWarehousesParam,
  useYearParam,
} from '@/lib/filters/hooks'
import { formatUSDWithSymbol } from '@/lib/formatters'
import {
  aggregateCube,
  type MonthRow,
  type ProfitabilityFilters,
  type ProfitabilityMetrics,
  type ProfitabilityTable,
} from '@/lib/profitability-aggregate'
import { cn } from '@/lib/utils'
import { departedDrilldownHref } from '@/lib/filters/serializers'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { endOfMonth, endOfYear } from 'date-fns'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ProfitabilityCubeRow } from 'shared-types'

const YEARS_IN_DROPDOWN = 5
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: YEARS_IN_DROPDOWN }, (_, i) => CURRENT_YEAR - i)

const NO_VALUE = '—'
const TOTAL_LABEL = 'Total'
const MARGIN_PCT_HEADER = 'Margin %'
const MARGIN_PCT_FRACTION_DIGITS = 1
const NEGATIVE_CLASS = 'text-destructive'

const STICKY_HEADER_CLASS =
  'sticky top-[calc(var(--app-header-height,0px)+var(--details-header-height,0px))] bg-background z-10'
const STICKY_FOOTER_CLASS = 'sticky bottom-0 bg-muted z-10'

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

const EMPTY_CUBE: ProfitabilityCubeRow[] = []

function formatMetric(value: number, format: 'money' | 'count'): string {
  if (format === 'count') return String(value)
  return formatUSDWithSymbol(value)
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
  if (filters.warehouseIds.length > 0) count += 1
  if (filters.salesRepId !== null) count += 1
  if (filters.vendorId !== null) count += 1
  if (filters.brandId !== null) count += 1
  return count
}

function ProfitabilityFilterBar(): React.JSX.Element {
  const [year, setYear] = useYearParam(CURRENT_YEAR)
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [salesRep, setSalesRep] = useSalespersonParam()
  const [vendor, setVendor] = useVendorParam()
  const [brand, setBrand] = useBrandParam()

  return (
    <div className="flex flex-row flex-wrap gap-2 items-center">
      <Select value={String(year)} onValueChange={(raw) => setYear(Number.parseInt(raw, 10))}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {YEARS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />

      <UserFilter
        selection={salesRep}
        onSelectionChange={setSalesRep}
        onClear={() => setSalesRep(null)}
        placeholder="Salesperson"
        clearLabel="Clear salesperson"
      />

      <CustomerFilter
        selection={vendor}
        onSelectionChange={setVendor}
        onClear={() => setVendor(null)}
        placeholder="Vendor"
        clearLabel="Clear vendor"
      />

      <BrandFilter selection={brand} onSelectionChange={setBrand} onClear={() => setBrand(null)} />
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
      <MetricCard label="Gross Revenue" value={formatUSDWithSymbol(totals.gross_revenue)} />
      <MetricCard
        label="Gross Margin"
        value={formatUSDWithSymbol(totals.gross_margin)}
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

function RangeLink({ href, label }: { href: string; label: string }): React.JSX.Element {
  return (
    <Link to={href} className="hover:underline">
      {label}
    </Link>
  )
}

function ProfitabilityTable({
  table,
  year,
  getRangeHref,
}: {
  table: ProfitabilityTable
  year: number
  getRangeHref: (from: Date, to: Date) => string
}): React.JSX.Element {
  const months = table.months.filter(monthHasActivity)
  const yearStart = new Date(year, 0, 1)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className={STICKY_HEADER_CLASS}>Month</TableHead>
          {METRIC_COLUMNS.map((column) => (
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
        {months.map((row) => {
          const monthStart = new Date(year, row.month - 1, 1)
          return (
            <TableRow key={row.month}>
              <TableCell className="font-medium">
                <RangeLink
                  href={getRangeHref(monthStart, endOfMonth(monthStart))}
                  label={MONTH_LABELS[row.month - 1]}
                />
              </TableCell>
              {METRIC_COLUMNS.map((column) => (
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
          )
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className={cn('font-semibold', STICKY_FOOTER_CLASS)}>
            <RangeLink href={getRangeHref(yearStart, endOfYear(yearStart))} label={TOTAL_LABEL} />
          </TableCell>
          {METRIC_COLUMNS.map((column) => (
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
  year,
  getRangeHref,
  hasActiveFilters,
  onClearFilters,
}: {
  table: ProfitabilityTable
  year: number
  getRangeHref: (from: Date, to: Date) => string
  hasActiveFilters: boolean
  onClearFilters: () => void
}): React.JSX.Element {
  if (!table.months.some(monthHasActivity)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">No activity for these filters.</p>
        {hasActiveFilters ? (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    )
  }
  return <ProfitabilityTable table={table} year={year} getRangeHref={getRangeHref} />
}

export function ProfitabilityReportPage(): React.JSX.Element {
  const [year] = useYearParam(CURRENT_YEAR)
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [salesRep, setSalesRep] = useSalespersonParam()
  const [vendor, setVendor] = useVendorParam()
  const [brand, setBrand] = useBrandParam()

  const filters = useMemo<ProfitabilityFilters>(
    () => ({
      year,
      warehouseIds: warehouses.map((w) => w.id),
      salesRepId: salesRep?.id ?? null,
      vendorId: vendor?.id ?? null,
      brandId: brand?.id ?? null,
    }),
    [year, warehouses, salesRep, vendor, brand],
  )

  const getRangeHref = useCallback(
    (from: Date, to: Date) => departedDrilldownHref(from, to, warehouses, brand),
    [warehouses, brand],
  )

  const { data: cube = EMPTY_CUBE, isLoading } = useProfitabilityReport(year)
  const table = useMemo(() => aggregateCube(cube, filters), [cube, filters])

  const activeFilterCount = countActiveFilters(filters)

  function clearFilters() {
    void setWarehouses([])
    void setSalesRep(null)
    void setVendor(null)
    void setBrand(null)
  }

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Profitability Report</h1>
            {isLoading ? (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SavedViewsButton pageKey="report_profitability" />
            <ShareButton />
          </div>
        </div>
        <ProfitabilityFilterBar />
        {activeFilterCount > 0 ? (
          <ActiveFilterBar count={activeFilterCount} onClear={clearFilters} />
        ) : null}
      </StickyPageHeader>
      <PageContent>
        <div className={cn('flex flex-col gap-4 transition-opacity', isLoading && 'opacity-50')}>
          <ProfitabilitySummaryCards totals={table.totals} />
          <ProfitabilityReportBody
            table={table}
            year={year}
            getRangeHref={getRangeHref}
            hasActiveFilters={activeFilterCount > 0}
            onClearFilters={clearFilters}
          />
        </div>
      </PageContent>
    </>
  )
}
