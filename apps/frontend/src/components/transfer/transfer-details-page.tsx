import { createAssetSummaryColumns } from '@/components/pages/column-defs/asset-summary-columns'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { CollectionDetailPage } from '@/components/collections/collection-detail-page'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { EditTransferMetadataModal } from '@/components/transfer/edit-transfer-metadata-modal'
import { TransferSummaryStrip } from '@/components/transfer/transfer-summary-strip'
import { getTransferHistory } from '@/data/api/transfer-api'
import { transferDetailKey, useTransferDetail } from '@/hooks/use-transfer'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { formatDate } from '@/lib/formatters'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'

export function TransferDetailsPage(): React.JSX.Element {
  const { collectionId: transferNumber } = useParams<{ collectionId: string }>()
  if (transferNumber === undefined) throw new Error('Missing collectionId/transferNumber parameter')

  const mutations = useTransferMutations()
  const detail = useTransferDetail(transferNumber)

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) =>
      createAssetSummaryColumns(assetHref, (asset) => mutations.removeAsset(transferNumber, asset)),
    [mutations, transferNumber],
  )

  return (
    <CollectionDetailPage
      section="transfers"
      titleLabel="Transfer"
      collectionId={transferNumber}
      permission="create_update_transfer"
      detail={detail}
      notFoundLabel="Transfer not found"
      refreshKey={transferDetailKey(transferNumber)}
      historyCacheKey={`transfer-history:${transferNumber}`}
      historyFetcher={() => getTransferHistory(transferNumber)}
      onBulkRemove={(assets) => mutations.bulkRemoveAssets(transferNumber, assets)}
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      renderSummaryStrip={(transfer) => <TransferSummaryStrip transfer={transfer} />}
      renderSubtitle={(transfer) => (
        <>
          <SummaryField label="From" value={transfer.origin.city_code} />
          <SummaryField label="To" value={transfer.destination.city_code} />
          <SummaryField label="Date" value={formatDate(transfer.created_at)} />
        </>
      )}
      renderMetadataModal={(transfer, control) => (
        <EditTransferMetadataModal
          open={control.open}
          onOpenChange={control.onOpenChange}
          transfer={transfer}
          onSave={(metadata) => mutations.updateMetadata(transferNumber, metadata)}
        />
      )}
      renderAddAssetBar={(transfer) => (
        <AddAssetBar
          existingAssets={transfer.assets}
          entityName="transfer"
          onAddSingle={(asset) => mutations.addAsset(transferNumber, asset)}
          onAddBatchFromHold={(assets) => mutations.addAssetBatch(transferNumber, assets)}
        />
      )}
    />
  )
}
