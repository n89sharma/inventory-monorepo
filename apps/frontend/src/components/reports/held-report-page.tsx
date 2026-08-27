import { PageContent } from '@/components/app-layout/page-content'
import {
  HELD_REPORT_COLUMNS,
  getHeldReportRowClassName,
  getHeldReportRowId,
  getHeldReportSubRows,
  toHeldReportTableRows,
} from './held-report-table-columns'
import { StickyPageHeader } from '@/components/app-layout/sticky-page-header'
import { DataTable } from '@/components/shared/data-table'
import { MetricCard } from './metric-card'
import { ShareButton } from '@/components/shared/share-button'
import { useHeldReport } from '@/hooks/use-held-report'
import { aggregateHeldReport, type HeldReportSummary } from '@/lib/held-report-aggregate'
import { cn } from '@/lib/utils'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { HeldReportRow } from 'shared-types'

const TABLE_LABEL = 'Held assets'

const DAYS_SUFFIX = 'd'
const SEARCH_ONHAND_URL = '/search/onhand'

const EMPTY_ROWS: HeldReportRow[] = []

function formatDays(value: number): string {
  return `${Math.round(value)}${DAYS_SUFFIX}`
}

function HeldReportSummaryCards({
  totals,
}: {
  totals: HeldReportSummary['totals']
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-3">
      <MetricCard label="Assets Held" value={String(totals.assetCount)} />
      <MetricCard label="Total Holds" value={String(totals.holdCount)} />
      <MetricCard label="Salespeople with Holds" value={String(totals.salespersonCount)} />
      <MetricCard label="Median Held Days" value={formatDays(totals.medianHeldDays)} />
    </div>
  )
}

function HeldReportBody({ table }: { table: HeldReportSummary }): React.JSX.Element {
  const rows = useMemo(() => toHeldReportTableRows(table.salespeople), [table.salespeople])

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">No active holds.</p>
        <Link to={SEARCH_ONHAND_URL} className="text-sm underline">
          Go to On-Hand
        </Link>
      </div>
    )
  }

  return (
    <DataTable
      label={TABLE_LABEL}
      columns={HELD_REPORT_COLUMNS}
      data={rows}
      getRowId={getHeldReportRowId}
      getSubRows={getHeldReportSubRows}
      getRowClassName={getHeldReportRowClassName}
    />
  )
}

export function HeldReportPage(): React.JSX.Element {
  const { data: rows = EMPTY_ROWS, isLoading } = useHeldReport()
  const table = useMemo(() => aggregateHeldReport(rows), [rows])

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Held Report</h1>
            {isLoading ? (
              <SpinnerGapIcon
                className="animate-spin text-muted-foreground"
                aria-label="Loading"
                role="status"
              />
            ) : null}
          </div>
          <ShareButton />
        </div>
      </StickyPageHeader>
      <PageContent>
        <div className={cn('flex flex-col gap-4 transition-opacity', isLoading && 'opacity-50')}>
          <HeldReportSummaryCards totals={table.totals} />
          <HeldReportBody table={table} />
        </div>
      </PageContent>
    </>
  )
}
