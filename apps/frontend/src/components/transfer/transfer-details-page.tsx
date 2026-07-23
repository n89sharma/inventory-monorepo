import { createAssetSummaryColumns } from '@/components/table-columns/collection-detail-columns'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { CollectionDetailPage } from '@/components/collections/collection-detail-page'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { EditTransferMetadataModal } from '@/components/transfer/edit-transfer-metadata-modal'
import { TransferLifecycleActions } from '@/components/transfer/transfer-lifecycle-actions'
import { TransferSummaryStrip } from '@/components/transfer/transfer-summary-strip'
import { getTransferHistory } from '@/data/api/transfer-api'
import { transferDetailKey, useTransferDetail } from '@/hooks/use-transfer'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { useCan } from '@/hooks/use-can'
import { formatDate, formatTitleCase } from '@/lib/formatters'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { TRANSFER_STATUS, type AssetSummary } from 'shared-types'

export function TransferDetailsPage(): React.JSX.Element {
  const { collectionId: transferNumber } = useParams<{ collectionId: string }>()
  if (transferNumber === undefined) throw new Error('Missing collectionId/transferNumber parameter')

  const mutations = useTransferMutations()
  const detail = useTransferDetail(transferNumber)
  const canCreateEditTransfer = useCan('create_update_transfer')
  const isDraft = detail.data?.status === TRANSFER_STATUS.DRAFT
  const canEditAssets = canCreateEditTransfer && isDraft

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) =>
      createAssetSummaryColumns(
        assetHref,
        canEditAssets ? (asset) => mutations.removeAsset(transferNumber, asset) : undefined,
      ),
    [mutations, transferNumber, canEditAssets],
  )

  return (
    <CollectionDetailPage
      section="transfers"
      titleLabel="Transfer"
      collectionId={transferNumber}
      canCreateEditEntity={canEditAssets}
      detail={detail}
      notFoundLabel="Transfer not found"
      refreshKey={transferDetailKey(transferNumber)}
      historyCacheKey={`transfer-history:${transferNumber}`}
      historyFetcher={() => getTransferHistory(transferNumber)}
      onBulkRemove={
        canEditAssets ? (assets) => mutations.bulkRemoveAssets(transferNumber, assets) : undefined
      }
      onFlushPending={mutations.flushPending}
      buildColumns={buildColumns}
      renderHeaderActions={(transfer) => (
        <TransferLifecycleActions
          status={transfer.status}
          assetCount={transfer.assets.length}
          onDispatch={() =>
            mutations.dispatch(
              transferNumber,
              transfer.assets.map((a) => a.barcode),
            )
          }
          onReceive={() =>
            mutations.receive(
              transferNumber,
              transfer.assets.map((a) => a.barcode),
            )
          }
        />
      )}
      renderSummaryStrip={(transfer) => <TransferSummaryStrip transfer={transfer} />}
      renderSubtitle={(transfer) => (
        <>
          <SummaryField label="Status" value={formatTitleCase(transfer.status)} />
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
      renderAddAssetBar={(transfer) =>
        canEditAssets && (
          <AddAssetBar
            existingAssets={transfer.assets}
            entityName="transfer"
            onAddSingle={(asset) => mutations.addAsset(transferNumber, asset)}
            onAddBatchFromHold={(assets) => mutations.addAssetBatch(transferNumber, assets)}
          />
        )
      }
    />
  )
}
