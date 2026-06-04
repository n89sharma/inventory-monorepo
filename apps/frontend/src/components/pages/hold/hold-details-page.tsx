import { HoldSummaryStrip } from '@/components/custom/cards/hold-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getHoldHistory } from '@/data/api/hold-api'
import { formatDate } from '@/lib/formatters'
import { holdDetailKey, useHoldDetail } from '@/hooks/use-hold'
import { useHoldMutations } from '@/hooks/use-hold-mutations'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { AddAssetBar } from '../../custom/add-asset-bar'
import { EditHoldMetadataModal } from '../../modals/edit-hold-metadata-modal'
import { CollectionDetailPage } from '../collection-detail-page'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function HoldDetailsPage(): React.JSX.Element {
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()
  if (holdNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useHoldMutations()
  const detail = useHoldDetail(holdNumber)

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) =>
      createAssetSummaryColumns(assetHref, asset => mutations.removeAsset(holdNumber, asset)),
    [mutations, holdNumber],
  )

  return (
    <CollectionDetailPage
      section="holds"
      titleLabel="Hold"
      collectionId={holdNumber}
      permission="create_update_hold"
      detail={detail}
      notFoundLabel="Hold not found"
      refreshKey={holdDetailKey(holdNumber)}
      historyCacheKey={`hold-history:${holdNumber}`}
      historyFetcher={() => getHoldHistory(holdNumber)}
      onBulkRemove={assets => mutations.bulkRemoveAssets(holdNumber, assets)}
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      renderSummaryStrip={hold => <HoldSummaryStrip hold={hold} />}
      renderSubtitle={hold => (
        <>
          <SummaryField label="Customer" value={hold.customer.name} />
          <SummaryField label="For" value={hold.created_for.name} />
          {hold.to_dt && <SummaryField label="To" value={formatDate(hold.to_dt)} />}
        </>
      )}
      renderMetadataModal={(hold, control) => (
        <EditHoldMetadataModal
          open={control.open}
          onOpenChange={control.onOpenChange}
          hold={hold}
          onSave={metadata => mutations.updateMetadata(holdNumber, metadata)}
        />
      )}
      renderAddAssetBar={hold => (
        <AddAssetBar
          existingAssets={hold.assets}
          entityName='hold'
          onAddSingle={asset => mutations.addAsset(holdNumber, asset)}
          validateAsset={asset => asset.hold_number ? `Asset ${asset.barcode} is already on a hold.` : null}
        />
      )}
    />
  )
}
