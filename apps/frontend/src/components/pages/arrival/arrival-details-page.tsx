import { ArrivalSummaryStrip } from '@/components/custom/cards/arrival-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getArrivalHistory } from '@/data/api/arrival-api'
import { formatDate } from '@/lib/formatters'
import { arrivalDetailKey, useArrivalDetail } from '@/hooks/use-arrival'
import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { useCan } from '@/hooks/use-can'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AssetForm } from '@/ui-types/arrival-form-types'
import type { AssetSummary } from 'shared-types'
import { AddAssetBarForArrival } from '../../custom/add-asset-bar-for-arrival'
import { AssetModal } from '../../modals/create-asset-modal'
import { EditArrivalMetadataModal } from '../../modals/edit-arrival-metadata-modal'
import { CollectionDetailPage } from '../collection-detail-page'
import { createArrivalAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function ArrivalDetailsPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()
  if (arrivalNumber === undefined) throw new Error('Missing collectionId/arrivalNumber parameter')

  const mutations = useArrivalMutations()
  const canEditArrival = useCan('create_update_arrival')
  const detail = useArrivalDetail(arrivalNumber)

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null)
  const [editingAssetForm, setEditingAssetForm] = useState<AssetForm | null>(null)

  const handleEditAsset = useCallback(
    async (assetId: number) => {
      setEditingAssetId(assetId)
      try {
        const form = await mutations.getAssetForEdit(arrivalNumber, assetId)
        setEditingAssetForm(form)
        setIsAssetModalOpen(true)
      } catch {
        setEditingAssetId(null)
      }
    },
    [mutations, arrivalNumber],
  )

  function handleModalOpenChange(open: boolean) {
    setIsAssetModalOpen(open)
    if (!open) {
      setEditingAssetId(null)
      setEditingAssetForm(null)
    }
  }

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) =>
      createArrivalAssetSummaryColumns(
        assetHref,
        (asset) => mutations.removeAsset(arrivalNumber, asset),
        canEditArrival ? (asset) => handleEditAsset(asset.id) : undefined,
        editingAssetId,
      ),
    [mutations, arrivalNumber, canEditArrival, editingAssetId, handleEditAsset],
  )

  return (
    <CollectionDetailPage
      section="arrivals"
      titleLabel="Arrival"
      collectionId={arrivalNumber}
      permission="create_update_arrival"
      detail={detail}
      notFoundLabel="Arrival not found"
      refreshKey={arrivalDetailKey(arrivalNumber)}
      historyCacheKey={`arrival-history:${arrivalNumber}`}
      historyFetcher={() => getArrivalHistory(arrivalNumber)}
      onBulkRemove={(assets) => mutations.bulkRemoveAssets(arrivalNumber, assets)}
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      renderSummaryStrip={(arrival) => <ArrivalSummaryStrip arrival={arrival} />}
      renderSubtitle={(arrival) => (
        <>
          <SummaryField label="Vendor" value={arrival.vendor.name} />
          <SummaryField label="Arrived" value={formatDate(arrival.created_at)} />
        </>
      )}
      renderMetadataModal={(arrival, control) => (
        <EditArrivalMetadataModal
          open={control.open}
          onOpenChange={control.onOpenChange}
          arrival={arrival}
          onSave={(metadata) => mutations.updateMetadata(arrivalNumber, metadata)}
        />
      )}
      renderAddAssetBar={() => (
        <>
          <AddAssetBarForArrival onCreate={() => setIsAssetModalOpen(true)} />
          <AssetModal
            open={isAssetModalOpen}
            onOpenChange={handleModalOpenChange}
            editingAsset={editingAssetForm}
            onCreateAsset={(asset) => mutations.createAsset(arrivalNumber, asset)}
            onUpdateAsset={(asset) => mutations.updateAsset(arrivalNumber, editingAssetId!, asset)}
          />
        </>
      )}
    />
  )
}
