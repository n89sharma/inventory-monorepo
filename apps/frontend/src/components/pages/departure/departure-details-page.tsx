import { DepartureSummaryStrip } from '@/components/custom/cards/departure-summary-strip'
import { CollectionHistorySection } from '@/components/custom/collection-history-section'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
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
import { CopyButton } from '../../custom/copy-button'
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
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('departures', departureNumber)} />
      <div className="flex items-center justify-between">
        <div className="group flex items-center gap-2">
          <h1 className="text-2xl font-semibold group flex items-center gap-2">
            Departure {departureNumber}
            <CopyButton value={departureNumber} />
          </h1>
        </div>
        <CollectionEditBar section="departures" collectionId={departureNumber} assets={departure.assets} />
      </div>
      <DepartureSummaryStrip departure={departure} />
      <BulkEditBar selectedAssets={selectedAssets} onClear={() => setRowSelection({})} refreshKey={departureDetailKey(departureNumber)} />
      <DataTable
        columns={columns}
        data={departure.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
      />
      <CollectionHistorySection
        cacheKey={`departure-history:${departureNumber}`}
        fetcher={() => getDepartureHistory(departureNumber)}
      />
    </div>
  )
}
