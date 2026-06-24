import { DepartureSummaryStrip } from '@/components/custom/cards/departure-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getDepartureHistory } from '@/data/api/departure-api'
import { formatDate } from '@/lib/formatters'
import { departureDetailKey, useDepartureDetail } from '@/hooks/use-departure'
import { useDepartureMutations } from '@/hooks/use-departure-mutations'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { AddAssetBar } from '../../custom/add-asset-bar'
import { DepartureOutgoingStatusToggle } from '../../custom/departure-outgoing-status-toggle'
import { EditDepartureMetadataModal } from '../../modals/edit-departure-metadata-modal'
import { CollectionDetailPage } from '../collection-detail-page'
import { createDepartureAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function DepartureDetailsPage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()
  if (departureNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useDepartureMutations()
  const detail = useDepartureDetail(departureNumber)

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) => createDepartureAssetSummaryColumns(assetHref),
    [],
  )

  return (
    <CollectionDetailPage
      section="departures"
      titleLabel="Departure"
      collectionId={departureNumber}
      permission="create_update_departure"
      detail={detail}
      notFoundLabel="Departure not found"
      refreshKey={departureDetailKey(departureNumber)}
      historyCacheKey={`departure-history:${departureNumber}`}
      historyFetcher={() => getDepartureHistory(departureNumber)}
      buildColumns={buildColumns}
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
      renderAddAssetBar={(departure) => (
        <AddAssetBar
          existingAssets={departure.assets}
          entityName="departure"
          onAddSingle={(asset) => mutations.addAsset(departureNumber, asset)}
          onAddBatchFromHold={(assets) => mutations.addAssetBatch(departureNumber, assets)}
        />
      )}
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
