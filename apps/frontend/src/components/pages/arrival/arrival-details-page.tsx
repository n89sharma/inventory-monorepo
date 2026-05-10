import { ArrivalSummaryStrip } from '@/components/custom/cards/arrival-summary-strip'
import { CollectionHistorySection } from '@/components/custom/collection-history-section'
import { getArrivalHistory } from '@/data/api/arrival-api'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { arrivalDetailKey, useArrivalDetail } from '@/hooks/use-arrival-detail'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { useNavigationStore } from '@/data/store/navigation-store'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { CopyButton } from '../../custom/copy-button'
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
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('arrivals', arrivalNumber)} />
      <div className="flex items-center justify-between">
        <div className="group flex items-center gap-2">
          <h1 className="text-2xl font-semibold group flex items-center gap-2">
            Arrival {arrivalNumber}
            <CopyButton value={arrivalNumber} />
          </h1>
        </div>
        <CollectionEditBar section="arrivals" collectionId={arrivalNumber} assets={arrival.assets} />
      </div>
      <ArrivalSummaryStrip arrival={arrival} />
      <BulkEditBar selectedAssets={selectedAssets} onClear={() => setRowSelection({})} refreshKey={arrivalDetailKey(arrivalNumber)} />
      <DataTable
        columns={columns}
        data={arrival.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
      />
      <CollectionHistorySection
        cacheKey={`arrival-history:${arrivalNumber}`}
        fetcher={() => getArrivalHistory(arrivalNumber)}
      />
    </div>
  )
}
