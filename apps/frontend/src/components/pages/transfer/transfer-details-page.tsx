import { SummaryField } from '@/components/custom/cards/summary-field'
import { TransferSummaryStrip } from '@/components/custom/cards/transfer-summary-strip'
import { getTransferHistory } from '@/data/api/transfer-api'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { formatDate } from '@/lib/formatters'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useTransferStore } from '@/data/store/transfer-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { transferDetailKey, useTransferDetail } from '@/hooks/use-transfer-detail'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AddAssetBar } from '../../custom/add-asset-bar'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { EditTransferMetadataModal } from '../../modals/edit-transfer-metadata-modal'
import { DataTable } from '../../shadcn/data-table'
import { useCan } from '@/hooks/use-can'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function TransferDetailsPage(): React.JSX.Element {
  const { collectionId: transferNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (transferNumber === undefined) throw new Error('Missing collectionId/transferNumber parameter')

  const removeAssetFromTransfer = useTransferStore(state => state.removeAssetFromTransfer)
  const bulkRemoveAssetsFromTransfer = useTransferStore(state => state.bulkRemoveAssetsFromTransfer)
  const addAssetToTransfer = useTransferStore(state => state.addAssetToTransfer)
  const addAssetsToTransfer = useTransferStore(state => state.addAssetsToTransfer)
  const updateTransferMetadata = useTransferStore(state => state.updateTransferMetadata)
  const flushPendingRemovals = useTransferStore(state => state.flushPendingRemovals)
  const canEditTransfer = useCan('create_update_transfer')
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)

  const columns = useMemo(
    () => createAssetSummaryColumns(
      'transfers',
      transferNumber,
      asset => removeAssetFromTransfer(transferNumber, asset)
    ),
    [transferNumber, removeAssetFromTransfer]
  )
  const { data: transfer, error: detailError, isLoading: detailLoading } = useTransferDetail(transferNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('transfers', pathname)
  }, [transferNumber])

  useEffect(() => {
    return () => flushPendingRemovals(transferNumber)
  }, [transferNumber, flushPendingRemovals])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!transfer) return <div>Transfer not found</div>

  const selectedAssets = transfer.assets.filter(a => rowSelection[a.barcode])

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary('transfers', transferNumber)}
        title={`Transfer ${transferNumber}`}
        copyValue={transferNumber}
        actions={
          <CollectionEditBar
            section="transfers"
            collectionId={transferNumber}
            assets={transfer.assets}
            historyCacheKey={`transfer-history:${transferNumber}`}
            historyFetcher={() => getTransferHistory(transferNumber)}
            onEdit={() => setIsMetadataModalOpen(true)}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <SummaryField label="From" value={transfer.origin.city_code} />
            <SummaryField label="To" value={transfer.destination.city_code} />
            <SummaryField label="Date" value={formatDate(transfer.created_at)} />
          </div>
        }
      />
      <PageContent className={`flex flex-col gap-4 ${selectedAssets.length > 0 ? 'pb-24' : ''}`}>
      <TransferSummaryStrip transfer={transfer} />
      <EditTransferMetadataModal
        open={isMetadataModalOpen}
        onOpenChange={setIsMetadataModalOpen}
        transfer={transfer}
        onSave={metadata => updateTransferMetadata(transferNumber, metadata)}
      />
      {canEditTransfer && (
        <AddAssetBar
          existingAssets={transfer.assets}
          entityName='transfer'
          onAddSingle={asset => addAssetToTransfer(transferNumber, asset)}
          onAddBatchFromHold={assets => addAssetsToTransfer(transferNumber, assets)}
        />
      )}
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={transferDetailKey(transferNumber)}
        currentCollectionType="transfers"
        returnTo={`/transfers/${transferNumber}`}
        onBulkRemove={assets => bulkRemoveAssetsFromTransfer(transferNumber, assets)}
        totalCount={transfer.assets.length}
        onSelectAll={() => setRowSelection(Object.fromEntries(transfer.assets.map(a => [a.barcode, true])))}
      />
      <DataTable
        columns={columns}
        data={transfer.assets}
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
