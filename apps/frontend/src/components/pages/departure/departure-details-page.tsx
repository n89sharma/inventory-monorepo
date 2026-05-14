import { DepartureSummaryStrip } from '@/components/custom/cards/departure-summary-strip'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { getDepartureHistory } from '@/data/api/departure-api'
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

  const columns = useMemo(() => createAssetSummaryColumns('departures', departureNumber), [departureNumber])
  const { data: departure, error: detailError, isLoading: detailLoading } = useDepartureDetail(departureNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('departures', pathname)
  }, [departureNumber])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!departure) return <div>Departure not found</div>

  const selectedAssets = departure.assets.filter(a => rowSelection[a.barcode])

  return (
    <div className="flex flex-col gap-4">
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
      />
      <DepartureSummaryStrip departure={departure} />
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={departureDetailKey(departureNumber)}
        currentCollectionType="departures"
        returnTo={`/departures/${departureNumber}`}
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
    </div>
  )
}
