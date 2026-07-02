import { PageContent } from '@/components/app-layout/page-content'
import { ModelFilter } from '@/components/shared/filters/model-filter'
import { createModelSalesColumns } from '@/components/table-columns/model-sales-columns'
import { Button } from '@/components/shadcn/button'
import { DataTable } from '@/components/shadcn/data-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { Toggle } from '@/components/shadcn/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { SavedViewsButton } from '@/components/shared/saved-views-button'
import { ShareButton } from '@/components/shared/share-button'
import { useModelSales } from '@/hooks/use-model-sales'
import {
  useModelParam,
  useSoldReportRangeParam,
  useSpecsVisibleParam,
  type SoldReportRange,
} from '@/lib/filters/hooks'
import { buildInStockModelPath } from '@/lib/filters/serializers'
import { formatUSD } from '@/lib/formatters'
import { filterByMonths, summarizeBands, type BandSummary } from '@/lib/model-sales-summary'
import { assetDetailHref } from '@/ui-types/navigation-context'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import type { VisibilityState } from '@tanstack/react-table'
import { format, subMonths } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ModelSaleRow, ModelSalesResult, ModelSummary } from 'shared-types'

const EMPTY_SALES: ModelSaleRow[] = []
const RANGE_OPTIONS = [6, 12] as const satisfies readonly SoldReportRange[]
const NO_MEDIAN = '—'
const MONTH_YEAR_FORMAT = 'MMM yyyy'
const SALE_DATE_FORMAT = 'MMMM d, yyyy'
const TABLE_PAGE_SIZE = 20
const SUMMARY_HEIGHT_VAR = '--sold-report-summary-height'
const TABLE_SCROLL_MAX_HEIGHT =
  `calc(100vh - var(--app-header-height, 0px) - var(--details-header-height, 0px)` +
  ` - var(${SUMMARY_HEIGHT_VAR}, 0px) - 7.5rem)`

const MODEL_SALES_SPEC_COLUMN_IDS = ['cassettes', 'internal_finisher', 'core_functions'] as const

function formatSaleSummary(sale: ModelSaleRow): string {
  return `for $${formatUSD(sale.sale_price)} on ${format(sale.departed_at, SALE_DATE_FORMAT)}`
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
            <TableHead />
            <TableHead />
            <TableHead className="text-center">Purchase price</TableHead>
            <TableHead className="text-center">Sale price</TableHead>
            <TableHead className="text-center">Sales</TableHead>
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

function MeasuredSummary({ children }: { children: ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty(SUMMARY_HEIGHT_VAR, `${el.offsetHeight}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty(SUMMARY_HEIGHT_VAR)
    }
  }, [])

  return (
    <div ref={ref} className="flex flex-col gap-4">
      {children}
    </div>
  )
}

function RangeSentence({
  count,
  range,
}: {
  count: number
  range: SoldReportRange
}): React.JSX.Element {
  const now = new Date()
  const from = format(subMonths(now, range), MONTH_YEAR_FORMAT)
  const to = format(now, MONTH_YEAR_FORMAT)
  return (
    <p className="text-sm text-muted-foreground">
      Data from {formatSalesCount(count)} in {from} to {to} shown.
    </p>
  )
}

function EmptyWindowState({
  range,
  lastSale,
}: {
  range: SoldReportRange
  lastSale: ModelSaleRow | null
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm">No sales in the last {range} mo</p>
      {lastSale ? (
        <p className="text-sm text-muted-foreground">
          Last sold {formatSaleSummary(lastSale)} — outside selected range
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No sales recorded for this model</p>
      )}
    </div>
  )
}

function SoldReportResults({
  data,
  model,
  range,
  visibleSales,
  bands,
  inStockHref,
  columnVisibility,
  getRowHref,
}: {
  data: ModelSalesResult | undefined
  model: ModelSummary | null
  range: SoldReportRange
  visibleSales: ModelSaleRow[]
  bands: BandSummary[]
  inStockHref: string
  columnVisibility: VisibilityState
  getRowHref: (row: ModelSaleRow) => string
}): React.JSX.Element | null {
  const columns = useMemo(() => createModelSalesColumns(getRowHref), [getRowHref])

  if (model === null) {
    return <p className="text-sm text-muted-foreground">Select a model to see its recent sales.</p>
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
    <div className="flex flex-col gap-1">
      <MeasuredSummary>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Last sold {formatSaleSummary(visibleSales[0])}</h2>
          <ViewStockButton count={data.in_stock_count} href={inStockHref} />
        </div>
        <MeterBandsTable bands={bands} />
        <RangeSentence count={visibleSales.length} range={range} />
      </MeasuredSummary>
      <DataTable
        columns={columns}
        data={visibleSales}
        defaultSort={{ id: 'departed_at', desc: true }}
        getRowHref={getRowHref}
        columnVisibility={columnVisibility}
        initialPageSize={TABLE_PAGE_SIZE}
        scrollMaxHeight={TABLE_SCROLL_MAX_HEIGHT}
      />
    </div>
  )
}

export function SoldReportPage(): React.JSX.Element {
  const [searchParams] = useSearchParams()
  const [modelQuery, setModelQuery] = useState('')

  const { model, setModel, clear } = useModelParam()
  const [range, setRange] = useSoldReportRangeParam()
  const [specsVisible, setSpecsVisible] = useSpecsVisibleParam()

  const { data, isLoading } = useModelSales(model?.id ?? null)

  const sales12 = data?.sales ?? EMPTY_SALES
  const sales6 = useMemo(() => filterByMonths(sales12, 6), [sales12])
  const rangeCounts = { 6: sales6.length, 12: sales12.length }
  const visibleSales = range === 6 ? sales6 : sales12
  const bands = useMemo(() => summarizeBands(visibleSales), [visibleSales])

  const inStockHref = model ? buildInStockModelPath(model.id) : ''

  const columnVisibility = useMemo<VisibilityState>(
    () => Object.fromEntries(MODEL_SALES_SPEC_COLUMN_IDS.map((id) => [id, specsVisible])),
    [specsVisible],
  )

  const getRowHref = useCallback(
    (row: ModelSaleRow) => assetDetailHref('sold-report', row.barcode, searchParams),
    [searchParams],
  )

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Sold Report</h1>
            {isLoading && (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <SavedViewsButton pageKey="sold_report" />
            <ShareButton />
          </div>
        </div>
        <form
          className="flex flex-row flex-wrap gap-2 items-end"
          onSubmit={(e) => e.preventDefault()}
        >
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
              clear()
            }}
            placeholder="Model *"
          />

          <ToggleGroup
            type="single"
            variant="outline"
            value={String(range)}
            onValueChange={(value) => {
              if (value === '') return
              setRange(value === '12' ? 12 : 6)
            }}
            aria-label="Sales window"
          >
            {RANGE_OPTIONS.map((option) => (
              <ToggleGroupItem key={option} value={String(option)}>
                {option} mo ({rangeCounts[option]})
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Toggle
            variant="outline"
            pressed={specsVisible}
            onPressedChange={setSpecsVisible}
            aria-label="Show spec columns"
          >
            {specsVisible ? 'Hide Specs' : 'Show Specs'}
          </Toggle>
        </form>
      </StickyPageHeader>
      <PageContent className="flex flex-col gap-2">
        <div className={isLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <SoldReportResults
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
      </PageContent>
    </>
  )
}
