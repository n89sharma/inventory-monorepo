import { HoldSummaryStrip } from '@/components/custom/cards/hold-summary-strip'
import { CollectionHistorySection } from '@/components/custom/collection-history-section'
import { getHoldHistory } from '@/data/api/hold-api'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { useNavigationStore } from '@/data/store/navigation-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { holdDetailKey, useHoldDetail } from '@/hooks/use-hold-detail'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { CopyButton } from '../../custom/copy-button'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function HoldDetailsPage(): React.JSX.Element {
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (holdNumber === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('holds', holdNumber), [holdNumber])
  const { data: hold, error: detailError, isLoading: detailLoading } = useHoldDetail(holdNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('holds', pathname)
  }, [holdNumber])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!hold) return <div>Hold not found</div>

  const selectedAssets = hold.assets.filter(a => rowSelection[a.barcode])

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('holds', holdNumber)} />
      <div className="flex items-center justify-between">
        <div className="group flex items-center gap-2">
          <h1 className="text-2xl font-semibold group flex items-center gap-2">
            Hold {holdNumber}
            <CopyButton value={holdNumber} />
          </h1>
        </div>
        <CollectionEditBar section="holds" collectionId={holdNumber} assets={hold.assets} />
      </div>
      <HoldSummaryStrip hold={hold} />
      <BulkEditBar selectedAssets={selectedAssets} onClear={() => setRowSelection({})} refreshKey={holdDetailKey(holdNumber)} />
      <DataTable
        columns={columns}
        data={hold.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
      />
      <CollectionHistorySection
        cacheKey={`hold-history:${holdNumber}`}
        fetcher={() => getHoldHistory(holdNumber)}
      />
    </div>
  )
}
