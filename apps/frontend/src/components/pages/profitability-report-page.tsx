import { SavedViewsButton } from '@/components/custom/saved-views-button'
import { SearchSelectInput } from '@/components/custom/search-select-input'
import { ShareButton } from '@/components/custom/share-button'
import { StickyPageHeader } from '@/components/custom/sticky-page-header'
import { PageContent } from '@/components/layout/page-content'
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
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ProfitabilityCubeRow } from 'shared-types'

const YEARS_IN_DROPDOWN = 5
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: YEARS_IN_DROPDOWN }, (_, i) => CURRENT_YEAR - i)

const ALL_VALUE = 'all'

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const METRIC_COLUMNS = [
  { key: 'asset_count', header: 'Asset Count', format: 'count' },
  { key: 'gross_revenue', header: 'Gross Revenue', format: 'money' },
  { key: 'cogs', header: 'COGS (total)', format: 'money' },
  { key: 'gross_margin', header: 'Gross Margin', format: 'money' },
  { key: 'transport_cost', header: 'Transport Cost', format: 'money' }
] as const satisfies readonly {
  key: keyof ProfitabilityMetrics
  header: string
  format: 'money' | 'count'
}[]

const EMPTY_CUBE: ProfitabilityCubeRow[] = []

function formatMetric(value: number, format: 'money' | 'count'): string {
  if (format === 'count') return String(value)
  return formatUSD(value)
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

function ProfitabilityTable({ table }: { table: ProfitabilityTable }): React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          {METRIC_COLUMNS.map(column => (
            <TableHead key={column.key} className="text-right">
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.months.map(row => (
          <TableRow key={row.month}>
            <TableCell className="font-medium">{MONTH_LABELS[row.month - 1]}</TableCell>
            {METRIC_COLUMNS.map(column => (
              <TableCell key={column.key} className="text-right tabular-nums">
                {formatMetric(row[column.key], column.format)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">Total</TableCell>
          {METRIC_COLUMNS.map(column => (
            <TableCell key={column.key} className="text-right font-semibold tabular-nums">
              {formatMetric(table.totals[column.key], column.format)}
            </TableCell>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  )
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

  function updateFilters(next: ProfitabilityFilters) {
    setSearchParams(filtersToParams(next), { replace: true })
  }

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Profitability</h1>
            {isLoading && (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <SavedViewsButton pageKey="report_profitability" />
            <ShareButton />
          </div>
        </div>
        <ProfitabilityFilterBar filters={filters} options={options} onChange={updateFilters} />
      </StickyPageHeader>
      <PageContent>
        <div className={isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <ProfitabilityTable table={table} />
        </div>
      </PageContent>
    </>
  )
}
