import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import { BrandFilter } from '@/components/shared/filters/brand-filter'
import { OrganizationFilter } from '@/components/shared/filters/organization-filter'
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
import { ActiveFilterBar } from '@/components/shared/active-filter-bar'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { DataGrid } from '@/components/shared/data-table'
import { MetricCard } from './metric-card'
import {
  createProfitabilityColumns,
  formatMarginPct,
  NEGATIVE_CLASS,
} from './profitability-table-columns'
import { SavedViewsButton } from '@/components/shared/saved-views-button'
import { ShareButton } from '@/components/shared/share-button'
import { useProfitabilityReport } from '@/hooks/use-profitability-report'
import {
  isValidDepartedDateRange,
  useBrandParam,
  useCustomerParam,
  useSalespersonParam,
  useVendorParam,
  useWarehousesParam,
  useYearParam,
} from '@/lib/filters/hooks'
import { getDefaultYear } from '@/lib/filters/defaults'
import { formatUSDWithSymbol } from '@/lib/formatters'
import {
  aggregateCube,
  type MonthRow,
  type ProfitabilityFilters,
  type ProfitabilityMetrics,
} from '@/lib/profitability-aggregate'
import { cn } from '@/lib/utils'
import { departedDrilldownHref } from '@/lib/filters/serializers'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import type { ProfitabilityCubeRow } from 'shared-types'

const TABLE_LABEL = 'Profitability by month'

const YEARS_IN_DROPDOWN = 5
const CURRENT_YEAR = getDefaultYear()
const YEARS = Array.from({ length: YEARS_IN_DROPDOWN }, (_, i) => CURRENT_YEAR - i)

const EMPTY_CUBE: ProfitabilityCubeRow[] = []

function monthHasActivity(row: MonthRow): boolean {
  return row.asset_count > 0 || row.gross_revenue !== 0 || row.gross_margin !== 0
}

function countActiveFilters(filters: ProfitabilityFilters): number {
  let count = 0
  if (filters.warehouseIds.length > 0) count += 1
  if (filters.salesRepId !== null) count += 1
  if (filters.vendorId !== null) count += 1
  if (filters.customerId !== null) count += 1
  if (filters.brandId !== null) count += 1
  return count
}

function ProfitabilityFilterBar(): React.JSX.Element {
  const [year, setYear] = useYearParam(CURRENT_YEAR)
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [salesRep, setSalesRep] = useSalespersonParam()
  const [vendor, setVendor] = useVendorParam()
  const [customer, setCustomer] = useCustomerParam()
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

      <OrganizationFilter
        selection={vendor}
        onSelectionChange={setVendor}
        onClear={() => setVendor(null)}
        placeholder="Vendor"
        clearLabel="Clear vendor"
      />

      <OrganizationFilter
        selection={customer}
        onSelectionChange={setCustomer}
        onClear={() => setCustomer(null)}
        placeholder="Customer"
        clearLabel="Clear customer"
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

function ProfitabilityReportBody({
  months,
  columns,
  hasActiveFilters,
  onClearFilters,
}: {
  months: MonthRow[]
  columns: ColumnDef<MonthRow>[]
  hasActiveFilters: boolean
  onClearFilters: () => void
}): React.JSX.Element {
  if (months.length === 0) {
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
  return <DataGrid label={TABLE_LABEL} columns={columns} data={months} />
}

export function ProfitabilityReportPage(): React.JSX.Element {
  const [year] = useYearParam(CURRENT_YEAR)
  const [warehouses, setWarehouses] = useWarehousesParam()
  const [salesRep, setSalesRep] = useSalespersonParam()
  const [vendor, setVendor] = useVendorParam()
  const [customer, setCustomer] = useCustomerParam()
  const [brand, setBrand] = useBrandParam()

  const filters = useMemo<ProfitabilityFilters>(
    () => ({
      year,
      warehouseIds: warehouses.map((w) => w.id),
      salesRepId: salesRep?.id ?? null,
      vendorId: vendor?.id ?? null,
      customerId: customer?.id ?? null,
      brandId: brand?.id ?? null,
    }),
    [year, warehouses, salesRep, vendor, customer, brand],
  )

  // Gated on the same predicate the departed page uses to decide whether to fetch, so a
  // rendered link can never land on a search that refuses to run.
  const getRangeHref = useCallback(
    (from: Date, to: Date) =>
      isValidDepartedDateRange(from, to)
        ? departedDrilldownHref({ from, to, warehouses, brand, customer, salesperson: salesRep })
        : null,
    [warehouses, brand, customer, salesRep],
  )

  const { data: cube = EMPTY_CUBE, isLoading } = useProfitabilityReport(year)
  const table = useMemo(() => aggregateCube(cube, filters), [cube, filters])
  const months = useMemo(() => table.months.filter(monthHasActivity), [table.months])
  const columns = useMemo(
    () => createProfitabilityColumns({ year, totals: table.totals, getRangeHref }),
    [year, table.totals, getRangeHref],
  )

  const activeFilterCount = countActiveFilters(filters)

  function clearFilters() {
    void setWarehouses([])
    void setSalesRep(null)
    void setVendor(null)
    void setCustomer(null)
    void setBrand(null)
  }

  return (
    <GridPageContent>
      <GridPageHeader>
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
      </GridPageHeader>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-4 transition-opacity',
          isLoading && 'opacity-50',
        )}
      >
        <PageSection>
          <ProfitabilitySummaryCards totals={table.totals} />
        </PageSection>
        <ProfitabilityReportBody
          months={months}
          columns={columns}
          hasActiveFilters={activeFilterCount > 0}
          onClearFilters={clearFilters}
        />
      </div>
    </GridPageContent>
  )
}
