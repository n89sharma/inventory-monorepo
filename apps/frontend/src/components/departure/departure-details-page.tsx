import { DepartureSummaryStrip } from '@/components/departure/departure-summary-strip'
import { EditDepartureMetadataModal } from '@/components/departure/edit-departure-metadata-modal'
import { createCollectionDetailColumns } from '@/components/table-columns/collection-detail-columns'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { CollectionDetailPage } from '@/components/collections/collection-detail-page'
import type { BulkExtraAction, BulkExtraActionGroup } from '@/components/collections/bulk-edit-bar'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { ReturnToStockDialog } from '@/components/departure/return-to-stock-dialog'
import { getDepartureHistory } from '@/data/api/departure-api'
import { departureDetailKey, useDepartureDetail } from '@/hooks/use-departure'
import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { useCan } from '@/hooks/use-can'
import { usePriceCellEditing } from '@/hooks/use-price-cell-editing'
import { formatDate } from '@/lib/formatters'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  OUTGOING_STATUS_LABELS,
  OutgoingStatusSchema,
  type AssetSearchRow,
  type OutgoingStatus,
  type PatchAssetPricing,
} from 'shared-types'

const OUTGOING_STATUS_OPTIONS = OutgoingStatusSchema.options
const OUTGOING_STATUS_HEADING = 'Set outgoing status'
const RETURN_TO_STOCK_LABEL = 'Return to stock'

function buildOutgoingStatusActions(onApply: (status: OutgoingStatus) => void): BulkExtraAction[] {
  return OUTGOING_STATUS_OPTIONS.map((status) => ({
    label: OUTGOING_STATUS_LABELS[status],
    onSelect: () => onApply(status),
  }))
}

export function DepartureDetailsPage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()
  if (departureNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useDepartureMutations()
  const detail = useDepartureDetail(departureNumber)
  const canCreateEditDeparture = useCan('create_update_departure')
  const canReturnToStock = useCan('return_to_stock')
  const can = useCan()
  const [returnToStockOpen, setReturnToStockOpen] = useState(false)

  const savePrice = useCallback(
    (barcode: string, patch: PatchAssetPricing) =>
      mutations.updatePrice(departureNumber, barcode, patch),
    [mutations, departureNumber],
  )
  const { priceEditorRegistry, tableMeta } = usePriceCellEditing(savePrice)

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSearchRow) => string) =>
      createCollectionDetailColumns({
        getHref: assetHref,
        can,
        priceEditorRegistry,
      }),
    [can, priceEditorRegistry],
  )

  return (
    <CollectionDetailPage
      section="departures"
      titleLabel="Departure"
      collectionId={departureNumber}
      canCreateEditEntity={canCreateEditDeparture}
      detail={detail}
      notFoundLabel="Departure not found"
      refreshKey={departureDetailKey(departureNumber)}
      historyCacheKey={`departure-history:${departureNumber}`}
      historyFetcher={() => getDepartureHistory(departureNumber)}
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      tableMeta={tableMeta}
      renderSummaryStrip={(departure) => <DepartureSummaryStrip departure={departure} />}
      renderSubtitle={(departure) => (
        <>
          <SummaryField label="Customer" value={departure.customer.name} />
          <SummaryField label="Departed" value={formatDate(departure.created_at)} />
        </>
      )}
      renderMetadataModal={(departure, control) => (
        <EditDepartureMetadataModal
          open={control.open}
          onOpenChange={control.onOpenChange}
          departure={departure}
          onSave={(metadata) => mutations.updateMetadata(departureNumber, metadata)}
        />
      )}
      renderAddAssetBar={(departure) =>
        canCreateEditDeparture && (
          <AddAssetBar
            existingAssets={departure.assets}
            entityName="departure"
            onAddSingle={(asset) => mutations.addAsset(departureNumber, asset)}
            onAddBatchFromHold={(assets) => mutations.addAssetBatch(departureNumber, assets)}
          />
        )
      }
      renderBulkExtraActions={({ selectedAssets, clearSelection }) => {
        const groups: BulkExtraActionGroup[] = []
        if (canCreateEditDeparture) {
          groups.push({
            heading: OUTGOING_STATUS_HEADING,
            actions: buildOutgoingStatusActions((status) => {
              mutations.setOutgoingStatus(
                departureNumber,
                selectedAssets.map((a) => a.id),
                status,
              )
              clearSelection()
            }),
          })
        }
        if (canReturnToStock) {
          groups.push({
            actions: [{ label: RETURN_TO_STOCK_LABEL, onSelect: () => setReturnToStockOpen(true) }],
          })
        }
        return {
          groups,
          dialogs: canReturnToStock && (
            <ReturnToStockDialog
              assetCount={selectedAssets.length}
              open={returnToStockOpen}
              onOpenChange={setReturnToStockOpen}
              onConfirm={() => {
                mutations.returnToStock(departureNumber, selectedAssets)
                clearSelection()
              }}
            />
          ),
        }
      }}
    />
  )
}
