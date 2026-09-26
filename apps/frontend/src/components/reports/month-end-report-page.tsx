import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import { GridPageHeader } from '@/components/app-layout/sticky-page-header'
import { DataGrid } from '@/components/shared/data-table'
import { ExportCsvButton } from '@/components/shared/export-csv-button'
import { FilterRow } from '@/components/shared/filter-row'
import { ExclusiveValueFilter } from '@/components/shared/filters/exclusive-value-filter'
import { WarehouseFilter } from '@/components/shared/filters/warehouse-filter'
import { ShareButton } from '@/components/shared/share-button'
import { toColumnDefs, toSummaryCsvColumns } from '@/components/table-columns/summary-column'
import { useMonthEndReport } from '@/hooks/use-month-end-report'
import { toCsv } from '@/lib/csv'
import { downloadFile } from '@/lib/download-file'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import {
  useAssetGroupParam,
  useBrandGroupParam,
  useMonthEndReportViewParam,
  useWarehousesParam,
} from '@/lib/filters/hooks'
import { formatFilenameDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { waitForNextPaint } from '@/lib/wait-for-next-paint'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ASSET_GROUP_LABELS,
  AssetGroupSchema,
  BRAND_GROUP_LABELS,
  BrandGroupSchema,
  type MonthEndReportAssetLine,
  type MonthEndSummary,
} from 'shared-types'
import { MONTH_END_ASSET_COLUMNS } from './month-end-report-asset-table-columns'
import { monthEndReportTitle } from './month-end-reports-table-columns'
import { MonthEndSummaryTable } from './month-end-summary-table'

const TABLE_LABEL = 'Assets'
const CSV_MIME_TYPE = 'text/csv'
const COMPANY_TOTAL_TITLE = 'Company total'
const SUMMARY_VIEW = 'summary'
const ASSETS_VIEW = 'assets'
const ALL_BRANDS_LABEL = 'All Brands'
const BRAND_GROUP_FILTER_LABEL = 'Filter by brand group'
const ALL_ASSET_TYPES_LABEL = 'All Types'
const ASSET_GROUP_FILTER_LABEL = 'Filter by asset type'
const DEFAULT_SORT = { id: 'barcode', desc: false } as const
const PINNED_COLUMN_IDS = ['barcode']
const EMPTY_ASSETS: MonthEndReportAssetLine[] = []

const ASSET_COLUMN_DEFS = toColumnDefs(MONTH_END_ASSET_COLUMNS, null)
const ASSET_CSV_COLUMNS = toSummaryCsvColumns(MONTH_END_ASSET_COLUMNS)

function parseReportId(raw: string | undefined): number | null {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

function MonthEndFilterBar(): React.JSX.Element {
  const [brandGroup, setBrandGroup] = useBrandGroupParam()
  const [assetGroup, setAssetGroup] = useAssetGroupParam()
  const [warehouses, setWarehouses] = useWarehousesParam()
  return (
    <FilterRow>
      <ExclusiveValueFilter
        values={BrandGroupSchema.options}
        labels={BRAND_GROUP_LABELS}
        selection={brandGroup}
        onSelectionChange={setBrandGroup}
        allLabel={ALL_BRANDS_LABEL}
        groupLabel={BRAND_GROUP_FILTER_LABEL}
      />
      <ExclusiveValueFilter
        values={AssetGroupSchema.options}
        labels={ASSET_GROUP_LABELS}
        selection={assetGroup}
        onSelectionChange={setAssetGroup}
        allLabel={ALL_ASSET_TYPES_LABEL}
        groupLabel={ASSET_GROUP_FILTER_LABEL}
      />
      <WarehouseFilter selection={warehouses} onSelectionChange={setWarehouses} />
    </FilterRow>
  )
}

function MonthEndSummarySection({ summary }: { summary: MonthEndSummary }): React.JSX.Element {
  return (
    <PageSection>
      <div className="flex flex-col gap-4">
        <MonthEndSummaryTable title={COMPANY_TOTAL_TITLE} table={summary.company} />
        {summary.warehouses.map((warehouse) => (
          <MonthEndSummaryTable
            key={warehouse.warehouse_id}
            title={warehouse.city_code}
            table={warehouse}
          />
        ))}
      </div>
    </PageSection>
  )
}

export function MonthEndReportPage(): React.JSX.Element {
  const reportId = parseReportId(useParams().reportId)
  const [brandGroup] = useBrandGroupParam()
  const [assetGroup] = useAssetGroupParam()
  const [warehouses] = useWarehousesParam()
  const [view, setView] = useMonthEndReportViewParam()
  const filters = useMemo(
    () => ({ brandGroup, assetGroup, warehouseIds: warehouses.map((w) => w.id) }),
    [brandGroup, assetGroup, warehouses],
  )
  const { data, isLoading } = useMonthEndReport(reportId, filters)
  const [exportLoading, setExportLoading] = useState(false)

  const assets = data?.assets ?? EMPTY_ASSETS
  const title = data ? monthEndReportTitle(data.header) : 'Month End Report'

  async function handleExport() {
    if (!data || assets.length === 0) return
    setExportLoading(true)
    try {
      await waitForNextPaint()
      const csv = toCsv(ASSET_CSV_COLUMNS, assets)
      downloadFile(
        `month-end-${data.header.period ?? formatFilenameDate(data.header.captured_at)}.csv`,
        new Blob([csv], { type: CSV_MIME_TYPE }),
      )
    } catch {
      toast.error('Failed to export month-end report', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <GridPageContent>
      <GridPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {isLoading ? (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ExportCsvButton
              loading={exportLoading}
              disabled={assets.length === 0 || exportLoading}
              onClick={handleExport}
            />
            <ShareButton />
          </div>
        </div>
        <MonthEndFilterBar />
      </GridPageHeader>
      <Tabs
        value={view}
        onValueChange={(next) => setView(next === ASSETS_VIEW ? ASSETS_VIEW : SUMMARY_VIEW)}
        className={cn('min-h-0 flex-1 transition-opacity', isLoading && 'opacity-50')}
      >
        <PageSection>
          <TabsList variant="line">
            <TabsTrigger value={SUMMARY_VIEW}>Summary</TabsTrigger>
            <TabsTrigger value={ASSETS_VIEW}>Assets ({assets.length.toLocaleString()})</TabsTrigger>
          </TabsList>
        </PageSection>
        <TabsContent value={SUMMARY_VIEW} className="min-h-0 overflow-y-auto">
          {data ? <MonthEndSummarySection summary={data.summary} /> : null}
        </TabsContent>
        <TabsContent value={ASSETS_VIEW} className="flex min-h-0 flex-col">
          <DataGrid
            label={TABLE_LABEL}
            columns={ASSET_COLUMN_DEFS}
            data={assets}
            defaultSort={DEFAULT_SORT}
            pinLeft={PINNED_COLUMN_IDS}
          />
        </TabsContent>
      </Tabs>
    </GridPageContent>
  )
}
