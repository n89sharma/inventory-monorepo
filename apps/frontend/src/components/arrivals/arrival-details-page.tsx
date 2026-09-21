import { OrgName } from '@/components/shared/org-name'
import { CreatedByField } from '@/components/shared/cards/created-by-field'
import { ArrivalSummaryStrip } from '@/components/arrivals/arrival-summary-strip'
import { arrivalVendorWarning } from '@/components/arrivals/arrival-vendor-mismatch'
import type { AssetWarningOf } from '@/components/table-columns/asset-search-columns'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryRoute } from '@/components/shared/cards/summary-route'
import { SummaryValue } from '@/components/shared/cards/summary-value'
import { getArrivalHistory } from '@/data/api/arrival-api'
import { arrivalDetailKey, useArrivalDetail } from '@/hooks/use-arrival'
import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { useCan } from '@/hooks/use-can'
import { useEntityDelete } from '@/hooks/use-entity-delete'
import { usePriceCellEditing } from '@/hooks/use-price-cell-editing'
import { useAssetComponents } from '@/hooks/use-reference-data'
import type { PersistedAsset } from '@/hooks/use-serial-number-check'
import { formatDate } from '@/lib/formatters'
import { PlusIcon } from '@phosphor-icons/react'
import type { AssetForm } from '@/ui-types/arrival-form-types'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  INVOICE_TYPE,
  OrgSummarySchema,
  type AssetSearchRow,
  type PatchAssetPricing,
} from 'shared-types'
import { createCollectionDetailColumns } from '../table-columns/collection-detail-columns'
import { Button } from '../shadcn/button'
import { CollectionDetailPage } from '../collections/collection-detail-page'
import { CreateAssetModal } from './create-asset-modal'
import { EditArrivalMetadataModal } from './edit-arrival-metadata-modal'
import { MoveToArrivalModal } from './move-to-arrival-modal'
import { SplitArrivalModal } from './split-arrival-modal'

const SPLIT_DISABLED_HINT = 'An arrival must keep at least one asset — clear a row to split.'

export function ArrivalDetailsPage(): React.JSX.Element {
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()
  if (arrivalNumber === undefined) throw new Error('Missing collectionId/arrivalNumber parameter')

  const mutations = useArrivalMutations()
  const canEditArrival = useCan('create_update_arrival')
  const can = useCan()
  const detail = useArrivalDetail(arrivalNumber)
  const counterpartyWarning = useMemo(
    () => (detail.data ? arrivalVendorWarning(detail.data) : null),
    [detail.data],
  )
  const components = useAssetComponents()

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null)
  const [editingPersistedAsset, setEditingPersistedAsset] = useState<PersistedAsset | null>(null)
  const [editingAssetForm, setEditingAssetForm] = useState<AssetForm | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [splitOpen, setSplitOpen] = useState(false)

  const handleDelete = useEntityDelete('Arrival', arrivalNumber, arrivalNumber, mutations.remove)

  const handleEditAsset = useCallback(
    async (assetId: number, persistedAsset: PersistedAsset) => {
      setEditingAssetId(assetId)
      setEditingPersistedAsset(persistedAsset)
      try {
        const form = await mutations.getAssetForEdit(arrivalNumber, assetId, components)
        setEditingAssetForm(form)
        setIsAssetModalOpen(true)
      } catch {
        setEditingAssetId(null)
        setEditingPersistedAsset(null)
      }
    },
    [mutations, arrivalNumber, components],
  )

  function handleModalOpenChange(open: boolean) {
    setIsAssetModalOpen(open)
    if (!open) {
      setEditingAssetId(null)
      setEditingPersistedAsset(null)
      setEditingAssetForm(null)
    }
  }

  const savePrice = useCallback(
    (barcode: string, patch: PatchAssetPricing) =>
      mutations.updatePrice(arrivalNumber, barcode, patch),
    [mutations, arrivalNumber],
  )
  const { priceEditorRegistry, tableMeta } = usePriceCellEditing(savePrice)

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSearchRow) => string, assetWarningOf: AssetWarningOf) =>
      createCollectionDetailColumns({
        getHref: assetHref,
        assetWarningOf,
        can,
        onEdit: canEditArrival
          ? (asset) =>
              handleEditAsset(asset.id, {
                barcode: asset.barcode,
                serialNumber: asset.serial_number,
              })
          : undefined,
        disabledRowId: editingAssetId,
        priceEditorRegistry,
      }),
    [can, canEditArrival, editingAssetId, handleEditAsset, priceEditorRegistry],
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
      getInvoicePrefill={(arrival) => ({
        invoiceType: INVOICE_TYPE.purchase,
        organization: OrgSummarySchema.parse(arrival.vendor),
      })}
      renderBulkExtraActions={({ selectedAssets, clearSelection }) => {
        if (!canEditArrival) return null
        const splitsEveryAsset = selectedAssets.length >= (detail.data?.assets.length ?? 0)
        return {
          groups: [
            {
              actions: [
                { label: 'Move to another arrival', onSelect: () => setMoveOpen(true) },
                {
                  label: 'Split to a new arrival',
                  onSelect: () => setSplitOpen(true),
                  blockedReason: splitsEveryAsset ? SPLIT_DISABLED_HINT : undefined,
                },
              ],
            },
          ],
          dialogs: (
            <>
              <MoveToArrivalModal
                open={moveOpen}
                onOpenChange={setMoveOpen}
                sourceArrivalNumber={arrivalNumber}
                selectedAssets={selectedAssets}
                onConfirmSuccess={clearSelection}
              />
              <SplitArrivalModal
                open={splitOpen}
                onOpenChange={setSplitOpen}
                sourceArrivalNumber={arrivalNumber}
                sourceWarehouseCode={detail.data?.warehouse?.city_code ?? null}
                sourceTransporter={detail.data?.transporter ?? null}
                selectedAssets={selectedAssets}
                onConfirmSuccess={clearSelection}
              />
            </>
          ),
        }
      }}
      onFlushPending={mutations.flushPending}
      onDelete={handleDelete}
      buildColumns={buildColumns}
      counterpartyWarning={counterpartyWarning}
      tableMeta={tableMeta}
      getNote={(arrival) => arrival.comment}
      renderCostSummaryStrip={(arrival) => <ArrivalSummaryStrip arrival={arrival} />}
      renderSummaryStrip={(arrival) => (
        <>
          <SummaryValue value={formatDate(arrival.created_at)} />
          <SummaryRoute
            from={<OrgName name={arrival.vendor.name} />}
            to={arrival.warehouse?.city_code}
          />
          <SummaryValue value={<OrgName name={arrival.transporter.name} />} />
          <AssetTotalsField assets={arrival.assets} />
          <CreatedByField value={arrival.created_by} />
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
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setIsAssetModalOpen(true)}>
              <PlusIcon />
              Create Asset
            </Button>
            <CreateAssetModal
              open={isAssetModalOpen}
              onOpenChange={handleModalOpenChange}
              editingAsset={editingAssetForm}
              persistedAsset={editingPersistedAsset}
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
