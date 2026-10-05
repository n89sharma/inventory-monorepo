import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import { ModelFilter } from '@/components/shared/filters/model-filter'
import { SalesWindowToggle } from '@/components/shared/filters/sales-window-toggle'
import { FilterRow } from '@/components/shared/filter-row'
import { createModelPriceHistoryColumns } from './model-price-history-table-columns'
import { Button } from '@/components/shadcn/button'
import { DataGrid, TABLE_HEAD_CLASS } from '@/components/shared/data-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { Toggle } from '@/components/shadcn/toggle'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { SavedViewsButton } from '@/components/shared/saved-views-button'
import { ShareButton } from '@/components/shared/share-button'
import { useModelPriceHistory } from '@/hooks/use-model-price-history'
import { useModelParam, useSalesWindowParam, useSpecsVisibleParam } from '@/lib/filters/hooks'
import type { SalesWindowMonths } from '@/lib/filters/parsers'
import { buildOnHandModelPath } from '@/lib/filters/serializers'
import { formatDateOnly, formatMonthYear, formatUSD } from '@/lib/formatters'
import { filterByMonths, summarizeBands, type BandSummary } from '@/lib/model-price-history-summary'
import { searchListAssetDetailHref } from '@/ui-types/navigation-context'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { subMonths } from 'date-fns'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ModelPriceHistoryResult, ModelPriceHistoryRow, ModelSummary } from 'shared-types'

const TABLE_LABEL = 'Model price history'

const EMPTY_SALES: ModelPriceHistoryRow[] = []
const NO_MEDIAN = '—'

const SPEC_COLUMN_IDS = ['cassettes', 'internal_finisher', 'core_functions'] as const
const DEPARTED_AT_DESC_SORT = { id: 'departed_at', desc: true }

function formatSaleSummary(sale: ModelPriceHistoryRow): string {
  return `for $${formatUSD(sale.sale_price)} on ${formatDateOnly(sale.departed_at)}`
}

function formatSalesCount(count: number): string {
  return count === 1 ? '1 sale' : `${count} sales`
}

function ViewStockButton({ count, href }: { count: number; href: string }): React.JSX.Element {
  if (count === 0) {
    return <p className="text-sm text-muted-foreground">None in stock</p>
  }
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to={href}>View stock ({count})</Link>
    </Button>
  )
}

function MeterBandsTable({ bands }: { bands: BandSummary[] }): React.JSX.Element {
  return (
    <div className="w-fit rounded-md border">
      <Table className="w-fit text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className={TABLE_HEAD_CLASS} />
            <TableHead className={TABLE_HEAD_CLASS} />
            <TableHead className={TABLE_HEAD_CLASS}>Median purchase price</TableHead>
            <TableHead className={TABLE_HEAD_CLASS}>Median sale price</TableHead>
            <TableHead className={TABLE_HEAD_CLASS}>Sales</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bands.map((band) => (
            <TableRow key={band.name}>
              <TableCell className="text-center font-medium">{band.name}</TableCell>
              <TableCell className="text-center">{band.label}</TableCell>
              <TableCell className="text-center tabular-nums">
                {band.purchaseMedian === null ? NO_MEDIAN : `$${formatUSD(band.purchaseMedian)}`}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {band.saleMedian === null ? NO_MEDIAN : `$${formatUSD(band.saleMedian)}`}
              </TableCell>
              <TableCell className="text-center tabular-nums">{band.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RangeSentence({
  count,
  range,
}: {
  count: number
  range: SalesWindowMonths
}): React.JSX.Element {
  const now = new Date()
  const from = formatMonthYear(subMonths(now, range))
  const to = formatMonthYear(now)
  return (
    <p className="text-sm text-muted-foreground">
      Data from {formatSalesCount(count)} in {from} to {to} shown.
    </p>
  )
}

function LastSaleNote({ lastSale }: { lastSale: ModelPriceHistoryRow | null }): React.JSX.Element {
  if (!lastSale) {
    return <p className="text-sm text-muted-foreground">No sales recorded for this model</p>
  }
  return (
    <p className="text-sm text-muted-foreground">
      Last sold {formatSaleSummary(lastSale)} — outside selected range
    </p>
  )
}

function EmptyWindowState({
  range,
  lastSale,
}: {
  range: SalesWindowMonths
  lastSale: ModelPriceHistoryRow | null
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm">No sales in the last {range} mo</p>
      <LastSaleNote lastSale={lastSale} />
    </div>
  )
}

function ModelPriceHistoryResults({
  data,
  model,
  range,
  visibleSales,
  bands,
  inStockHref,
  columnVisibility,
  getRowHref,
}: {
  data: ModelPriceHistoryResult | undefined
  model: ModelSummary | null
  range: SalesWindowMonths
  visibleSales: ModelPriceHistoryRow[]
  bands: BandSummary[]
  inStockHref: string
  columnVisibility: VisibilityState
  getRowHref: (row: ModelPriceHistoryRow) => string
}): React.JSX.Element | null {
  const columns = useMemo(() => createModelPriceHistoryColumns(getRowHref), [getRowHref])

  if (model === null) {
    return <p className="text-sm text-muted-foreground">Select a model to see its price history.</p>
  }
  if (data === undefined) return null
  if (visibleSales.length === 0) {
    return (
      <div className="flex items-start justify-between gap-4">
        <EmptyWindowState range={range} lastSale={data.last_sale} />
        <ViewStockButton count={data.in_stock_count} href={inStockHref} />
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1">
      <PageSection className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Last sold {formatSaleSummary(visibleSales[0])}</h2>
          <ViewStockButton count={data.in_stock_count} href={inStockHref} />
        </div>
        <MeterBandsTable bands={bands} />
        <RangeSentence count={visibleSales.length} range={range} />
      </PageSection>
      <DataGrid
        label={TABLE_LABEL}
        columns={columns}
        data={visibleSales}
        defaultSort={DEPARTED_AT_DESC_SORT}
        getRowHref={getRowHref}
        columnVisibility={columnVisibility}
      />
    </div>
  )
}

export function ModelPriceHistoryPage(): React.JSX.Element {
  const searchParams = useOptimisticSearchParams()
  const [modelQuery, setModelQuery] = useState('')

  const [model, setModel] = useModelParam()
  const [range, setRange] = useSalesWindowParam()
  const [specsVisible, setSpecsVisible] = useSpecsVisibleParam()

  const { data, isLoading } = useModelPriceHistory(model?.id ?? null)

  const sales12 = data?.sales ?? EMPTY_SALES
  const sales6 = useMemo(() => filterByMonths(sales12, 6), [sales12])
  const sales1 = useMemo(() => filterByMonths(sales12, 1), [sales12])
  const salesByWindow: Record<SalesWindowMonths, ModelPriceHistoryRow[]> = {
    1: sales1,
    6: sales6,
    12: sales12,
  }
  const visibleSales = salesByWindow[range]
  const bands = useMemo(() => summarizeBands(visibleSales), [visibleSales])

  const inStockHref = model ? buildOnHandModelPath(model.id) : ''

  const columnVisibility = useMemo<VisibilityState>(
    () => Object.fromEntries(SPEC_COLUMN_IDS.map((id) => [id, specsVisible])),
    [specsVisible],
  )

  const getRowHref = useCallback(
    (row: ModelPriceHistoryRow) =>
      searchListAssetDetailHref('model-price-history', row.barcode, searchParams),
    [searchParams],
  )

  return (
    <GridPageContent>
      <GridPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Model Price History</h1>
            {isLoading && (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <SavedViewsButton pageKey="model_price_history" />
            <ShareButton />
          </div>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <FilterRow>
            <ModelFilter
              selection={model}
              query={modelQuery}
              onSelectionChange={(m) => {
                setModelQuery('')
                setModel(m)
              }}
              onQueryChange={setModelQuery}
              onClear={() => {
                setModelQuery('')
                setModel(null)
              }}
              placeholder="Model *"
            />

            <SalesWindowToggle
              months={range}
              onMonthsChange={setRange}
              getLabel={(option) => `${option} mo (${salesByWindow[option].length})`}
            />

            <Toggle
              variant="outline"
              pressed={specsVisible}
              onPressedChange={setSpecsVisible}
              aria-label="Show spec columns"
            >
              {specsVisible ? 'Hide Specs' : 'Show Specs'}
            </Toggle>
          </FilterRow>
        </form>
      </GridPageHeader>
      <div
        className={`flex min-h-0 flex-1 flex-col ${isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}`}
      >
        <ModelPriceHistoryResults
          data={data}
          model={model}
          range={range}
          visibleSales={visibleSales}
          bands={bands}
          inStockHref={inStockHref}
          columnVisibility={columnVisibility}
          getRowHref={getRowHref}
        />
      </div>
    </GridPageContent>
  )
}
