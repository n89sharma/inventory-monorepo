import { ArrivalSummaryStrip } from '@/components/custom/cards/arrival-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getArrivalHistory } from '@/data/api/arrival-api'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { formatDate } from '@/lib/formatters'
import { arrivalDetailKey, useArrivalDetail } from '@/hooks/use-arrival-detail'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { useArrivalStore } from '@/data/store/arrival-store'
import { useNavigationStore } from '@/data/store/navigation-store'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { AssetForm } from '@/ui-types/arrival-form-types'
import { AddAssetBarForArrival } from '../../custom/add-asset-bar-for-arrival'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { AssetModal } from '../../modals/create-asset-modal'
import { EditArrivalMetadataModal } from '../../modals/edit-arrival-metadata-modal'
import { DataTable } from '../../shadcn/data-table'
import { useCan } from '@/hooks/use-can'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function ArrivalDetailsPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (arrivalNumber === undefined) throw new Error('Missing collectionId/arrivalNumber parameter')

  const removeAssetFromArrival = useArrivalStore(state => state.removeAssetFromArrival)
  const bulkRemoveAssetsFromArrival = useArrivalStore(state => state.bulkRemoveAssetsFromArrival)
  const createArrivalAsset = useArrivalStore(state => state.createArrivalAsset)
  const getArrivalAssetForEdit = useArrivalStore(state => state.getArrivalAssetForEdit)
  const updateArrivalAsset = useArrivalStore(state => state.updateArrivalAsset)
  const updateArrivalMetadata = useArrivalStore(state => state.updateArrivalMetadata)
  const flushPendingRemovals = useArrivalStore(state => state.flushPendingRemovals)
  const canEditArrival = useCan('create_update_arrival')
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null)
  const [editingAssetForm, setEditingAssetForm] = useState<AssetForm | null>(null)

  async function handleEditAsset(assetId: number) {
    setEditingAssetId(assetId)
    try {
      const form = await getArrivalAssetForEdit(arrivalNumber!, assetId)
      setEditingAssetForm(form)
      setIsAssetModalOpen(true)
    } catch {
      setEditingAssetId(null)
    }
  }

  function handleModalOpenChange(open: boolean) {
    setIsAssetModalOpen(open)
    if (!open) {
      setEditingAssetId(null)
      setEditingAssetForm(null)
    }
  }

  const columns = useMemo(
    () => createAssetSummaryColumns(
      'arrivals',
      arrivalNumber,
      asset => removeAssetFromArrival(arrivalNumber, asset),
      canEditArrival ? asset => handleEditAsset(asset.id) : undefined,
      editingAssetId
    ),
    [arrivalNumber, removeAssetFromArrival, canEditArrival, editingAssetId]
  )

  const { data: arrival, error: detailError, isLoading: detailLoading } = useArrivalDetail(arrivalNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('arrivals', pathname)
  }, [arrivalNumber])

  useEffect(() => {
    return () => flushPendingRemovals(arrivalNumber)
  }, [arrivalNumber, flushPendingRemovals])

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
            onEdit={() => setIsMetadataModalOpen(true)}
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
      <EditArrivalMetadataModal
        open={isMetadataModalOpen}
        onOpenChange={setIsMetadataModalOpen}
        arrival={arrival}
        onSave={metadata => updateArrivalMetadata(arrivalNumber, metadata)}
      />
      {canEditArrival && (
        <AddAssetBarForArrival onCreate={() => setIsAssetModalOpen(true)} />
      )}
      <AssetModal
        open={isAssetModalOpen}
        onOpenChange={handleModalOpenChange}
        editingAsset={editingAssetForm}
        onCreateAsset={asset => createArrivalAsset(arrivalNumber, asset)}
        onUpdateAsset={asset => updateArrivalAsset(arrivalNumber!, editingAssetId!, asset)}
      />
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={arrivalDetailKey(arrivalNumber)}
        currentCollectionType="arrivals"
        returnTo={`/arrivals/${arrivalNumber}`}
        onBulkRemove={assets => bulkRemoveAssetsFromArrival(arrivalNumber, assets)}
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
