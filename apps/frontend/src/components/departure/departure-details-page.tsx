import { DepartureSummaryStrip } from '@/components/departure/departure-summary-strip'
import { EditDepartureMetadataModal } from '@/components/departure/edit-departure-metadata-modal'
import { createCollectionDetailColumns } from '@/components/table-columns/collection-detail-columns'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { CollectionDetailPage } from '@/components/collections/collection-detail-page'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { DepartureOutgoingStatusToggle } from '@/components/departure/departure-outgoing-status-toggle'
import { getDepartureHistory } from '@/data/api/departure-api'
import { departureDetailKey, useDepartureDetail } from '@/hooks/use-departure'
import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { useCan } from '@/hooks/use-can'
import { usePriceCellEditing } from '@/hooks/use-price-cell-editing'
import { formatDate } from '@/lib/formatters'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { AssetSearchRow, PatchAssetPricing } from 'shared-types'

export function DepartureDetailsPage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()
  if (departureNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useDepartureMutations()
  const detail = useDepartureDetail(departureNumber)
  const canCreateEditDeparture = useCan('create_update_departure')
  const can = useCan()

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
      renderBulkExtraActions={({ selectedAssets, clearSelection }) => (
        <DepartureOutgoingStatusToggle
          onApply={(status) => {
            mutations.setOutgoingStatus(
              departureNumber,
              selectedAssets.map((a) => a.id),
              status,
            )
            clearSelection()
          }}
        />
      )}
    />
  )
}
