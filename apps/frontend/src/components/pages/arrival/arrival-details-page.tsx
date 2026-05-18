import { ArrivalSummaryStrip } from '@/components/custom/cards/arrival-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getArrivalHistory } from '@/data/api/arrival-api'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { formatDate } from '@/lib/formatters'
import { arrivalDetailKey, useArrivalDetail } from '@/hooks/use-arrival-detail'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { useNavigationStore } from '@/data/store/navigation-store'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function ArrivalDetailsPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (arrivalNumber === undefined) throw new Error('Missing collectionId/arrivalNumber parameter')

  const columns = useMemo(() => createAssetSummaryColumns('arrivals', arrivalNumber), [arrivalNumber])

  const { data: arrival, error: detailError, isLoading: detailLoading } = useArrivalDetail(arrivalNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('arrivals', pathname)
  }, [arrivalNumber])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!arrival) return <div>Arrival not found</div>

  const selectedAssets = arrival.assets.filter(a => rowSelection[a.barcode])

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary('arrivals', arrivalNumber)}
        title={`Arrival ${arrivalNumber}`}
        copyValue={arrivalNumber}
        actions={
          <CollectionEditBar
            section="arrivals"
            collectionId={arrivalNumber}
            assets={arrival.assets}
            historyCacheKey={`arrival-history:${arrivalNumber}`}
            historyFetcher={() => getArrivalHistory(arrivalNumber)}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <SummaryField label="Vendor" value={arrival.vendor.name} />
            <SummaryField label="Arrived" value={formatDate(arrival.created_at)} />
          </div>
        }
      />
      <PageContent className={`flex flex-col gap-4 ${selectedAssets.length > 0 ? 'pb-24' : ''}`}>
      <ArrivalSummaryStrip arrival={arrival} />
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={arrivalDetailKey(arrivalNumber)}
        returnTo={`/arrivals/${arrivalNumber}`}
        totalCount={arrival.assets.length}
        onSelectAll={() => setRowSelection(Object.fromEntries(arrival.assets.map(a => [a.barcode, true])))}
      />
      <DataTable
        columns={columns}
        data={arrival.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
        defaultSort={{ id: 'barcode', desc: true }}
      />
      </PageContent>
    </>
  )
}
