import { ArrivalSummaryStrip } from '@/components/arrivals/arrival-summary-strip'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { getArrivalHistory } from '@/data/api/arrival-api'
import { arrivalDetailKey, useArrivalDetail } from '@/hooks/use-arrival'
import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { useCan } from '@/hooks/use-can'
import { formatDate } from '@/lib/formatters'
import { PlusIcon } from '@phosphor-icons/react'
import type { AssetForm } from '@/ui-types/arrival-form-types'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { createArrivalDetailColumns } from '../table-columns/collection-detail-columns'
import { Button } from '../shadcn/button'
import { CollectionDetailPage } from '../collections/collection-detail-page'
import { CreateAssetModal } from './create-asset-modal'
import { EditArrivalMetadataModal } from './edit-arrival-metadata-modal'
import { MoveToArrivalModal } from './move-to-arrival-modal'

export function ArrivalDetailsPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()
  if (arrivalNumber === undefined) throw new Error('Missing collectionId/arrivalNumber parameter')

  const mutations = useArrivalMutations()
  const canEditArrival = useCan('create_update_arrival')
  const detail = useArrivalDetail(arrivalNumber)

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null)
  const [editingAssetForm, setEditingAssetForm] = useState<AssetForm | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)

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
      createArrivalDetailColumns(
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
      canCreateEditEntity={canEditArrival}
      detail={detail}
      notFoundLabel="Arrival not found"
      refreshKey={arrivalDetailKey(arrivalNumber)}
      historyCacheKey={`arrival-history:${arrivalNumber}`}
      historyFetcher={() => getArrivalHistory(arrivalNumber)}
      onBulkRemove={(assets) => mutations.bulkRemoveAssets(arrivalNumber, assets)}
      renderBulkExtraActions={({ selectedAssets, clearSelection }) => {
        if (!canEditArrival) return null
        return (
          <>
            <Button variant="secondary" onClick={() => setMoveOpen(true)}>
              Move to arrival
            </Button>
            <MoveToArrivalModal
              open={moveOpen}
              onOpenChange={setMoveOpen}
              sourceArrivalNumber={arrivalNumber}
              selectedAssets={selectedAssets}
              onConfirmSuccess={clearSelection}
            />
          </>
        )
      }}
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
      renderAddAssetBar={() =>
        canEditArrival && (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setIsAssetModalOpen(true)}>
              <PlusIcon />
              Create Asset
            </Button>
            <CreateAssetModal
              open={isAssetModalOpen}
              onOpenChange={handleModalOpenChange}
              editingAsset={editingAssetForm}
              onCreateAsset={(asset) => mutations.createAsset(arrivalNumber, asset)}
              onUpdateAsset={(asset) =>
                mutations.updateAsset(arrivalNumber, editingAssetId!, asset)
              }
            />
          </div>
        )
      }
    />
  )
}
