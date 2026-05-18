import { DepartureSummaryStrip } from '@/components/custom/cards/departure-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { formatDate } from '@/lib/formatters'
import { getDepartureHistory } from '@/data/api/departure-api'
import { useDepartureStore } from '@/data/store/departure-store'
import { useNavigationStore } from '@/data/store/navigation-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { departureDetailKey, useDepartureDetail } from '@/hooks/use-departure-detail'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function DepartureDetailsPage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (departureNumber === undefined) throw new Error('Missing collectionId parameter')

  const removeAssetFromDeparture = useDepartureStore(state => state.removeAssetFromDeparture)
  const bulkRemoveAssetsFromDeparture = useDepartureStore(state => state.bulkRemoveAssetsFromDeparture)
  const flushPendingRemovals = useDepartureStore(state => state.flushPendingRemovals)

  const columns = useMemo(
    () => createAssetSummaryColumns(
      'departures',
      departureNumber,
      asset => removeAssetFromDeparture(departureNumber, asset)
    ),
    [departureNumber, removeAssetFromDeparture]
  )
  const { data: departure, error: detailError, isLoading: detailLoading } = useDepartureDetail(departureNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('departures', pathname)
  }, [departureNumber])

  useEffect(() => {
    return () => flushPendingRemovals(departureNumber)
  }, [departureNumber, flushPendingRemovals])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!departure) return <div>Departure not found</div>

  const selectedAssets = departure.assets.filter(a => rowSelection[a.barcode])

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary('departures', departureNumber)}
        title={`Departure ${departureNumber}`}
        copyValue={departureNumber}
        actions={
          <CollectionEditBar
            section="departures"
            collectionId={departureNumber}
            assets={departure.assets}
            historyCacheKey={`departure-history:${departureNumber}`}
            historyFetcher={() => getDepartureHistory(departureNumber)}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <SummaryField label="Customer" value={departure.customer.name} />
            <SummaryField label="Departed" value={formatDate(departure.created_at)} />
          </div>
        }
      />
      <PageContent className="flex flex-col gap-4">
      <DepartureSummaryStrip departure={departure} />
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={departureDetailKey(departureNumber)}
        currentCollectionType="departures"
        returnTo={`/departures/${departureNumber}`}
        onBulkRemove={assets => bulkRemoveAssetsFromDeparture(departureNumber, assets)}
      />
      <DataTable
        columns={columns}
        data={departure.assets}
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
