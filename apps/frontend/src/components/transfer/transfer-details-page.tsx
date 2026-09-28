import { PlusIcon } from '@phosphor-icons/react'
import { OrgName } from '@/components/shared/org-name'
import { CreatedByField } from '@/components/shared/cards/created-by-field'
import { createCollectionDetailColumns } from '@/components/table-columns/collection-detail-columns'
import { AddAssetBar } from '@/components/collections/add-asset-bar'
import { AddFromHoldModal } from '@/components/collections/add-from-hold-modal'
import {
  COLLECTION_DETAILS_TAB,
  CollectionDetailPage,
  type CollectionExtraTab,
} from '@/components/collections/collection-detail-page'
import type { BulkExtraActionGroup } from '@/components/collections/bulk-edit-bar'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryRoute } from '@/components/shared/cards/summary-route'
import { SummaryValue } from '@/components/shared/cards/summary-value'
import { TransferStatusBadge } from '@/components/transfer/transfer-status-badge'
import { EditTransferMetadataModal } from '@/components/transfer/edit-transfer-metadata-modal'
import { EditTransferNotesModal } from '@/components/transfer/edit-transfer-notes-modal'
import { TransferLifecycleActions } from '@/components/transfer/transfer-lifecycle-actions'
import { TransferLoadingPanel } from '@/components/transfer/transfer-loading-panel'
import { TransferUnloadingPanel } from '@/components/transfer/transfer-unloading-panel'
import { ReturnToOriginDialog } from '@/components/transfer/return-to-origin-dialog'
import { getTransferHistory } from '@/data/api/transfer-api'
import { transferDetailKey, useTransferDetail } from '@/hooks/use-transfer'
import { useTransferMutations } from '@/hooks/use-transfer-mutations'
import { useCan } from '@/hooks/use-can'
import { useEntityDelete } from '@/hooks/use-entity-delete'
import { usePriceCellEditing } from '@/hooks/use-price-cell-editing'
import { formatDate } from '@/lib/formatters'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ASSET_STATUS,
  TRANSFER_STATUS,
  type AssetSearchRow,
  type PatchAssetPricing,
  type TransferAssetRow,
  type TransferDetail,
} from 'shared-types'
import type { TransferMetadataForm } from '@/ui-types/transfer-form-types'

const ADD_FROM_HOLD_LABEL = 'Add Assets from Hold'
const RETURN_TO_ORIGIN_LABEL = 'Return to origin'
const UNTESTED_READINESS = 'UNTESTED'

const LOADING_TAB = 'loading'
const UNLOADING_TAB = 'unloading'

function pendingLoadCountOf(assets: TransferAssetRow[]): number {
  return assets.filter((asset) => !asset.scan.loaded && asset.status !== ASSET_STATUS.MISSING)
    .length
}

function pendingUnloadCountOf(assets: TransferAssetRow[]): number {
  return assets.filter(
    (asset) => asset.scan.loaded && !asset.scan.unloaded && asset.status !== ASSET_STATUS.MISSING,
  ).length
}

function tabForStatus(status: string): string {
  if (status === TRANSFER_STATUS.LOADING_IN_PROGRESS) return LOADING_TAB
  if (status === TRANSFER_STATUS.UNLOADING_IN_PROGRESS) return UNLOADING_TAB
  return COLLECTION_DETAILS_TAB
}

export function TransferDetailsPage(): React.JSX.Element {
  const { collectionId: transferNumber } = useParams<{ collectionId: string }>()
  if (transferNumber === undefined) throw new Error('Missing collectionId/transferNumber parameter')

  const mutations = useTransferMutations()
  const detail = useTransferDetail(transferNumber)
  const canCreateEditTransfer = useCan('create_update_transfer')
  const can = useCan()
  const isDraft = detail.data?.status === TRANSFER_STATUS.DRAFT
  const isInTransit = detail.data?.status === TRANSFER_STATUS.IN_TRANSIT
  const canEditAssets = canCreateEditTransfer && isDraft
  const canReturnToOrigin = canCreateEditTransfer && isInTransit
  const [returnToOriginOpen, setReturnToOriginOpen] = useState(false)

  const [activeTab, setActiveTab] = useState<string>(COLLECTION_DETAILS_TAB)
  const prevStatusRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const currStatus = detail.data?.status
    if (currStatus === undefined) return
    const prevStatus = prevStatusRef.current
    prevStatusRef.current = currStatus
    if (prevStatus !== currStatus) setActiveTab(tabForStatus(currStatus))
  }, [detail.data?.status])

  // Bumped every time the active tab changes (by user click or the auto-switch above), so the
  // Loading/Unloading scan input remounts and reliably grabs focus each time its tab is entered
  // — including re-entering the same tab after visiting another one. Adjusting state during
  // render (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab)
  const [focusNonce, setFocusNonce] = useState(0)
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab)
    setFocusNonce((n) => n + 1)
  }

  const savePrice = useCallback(
    (barcode: string, patch: PatchAssetPricing) =>
      mutations.updatePrice(transferNumber, barcode, patch),
    [mutations, transferNumber],
  )
  const { priceEditorRegistry, tableMeta } = usePriceCellEditing(savePrice)
  const [addFromHoldOpen, setAddFromHoldOpen] = useState(false)
  const handleDelete = useEntityDelete('Transfer', transferNumber, transferNumber, mutations.remove)

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSearchRow) => string) =>
      createCollectionDetailColumns({
        getHref: assetHref,
        can,
        priceEditorRegistry,
      }),
    [can, priceEditorRegistry],
  )

  const transferTabs: CollectionExtraTab[] = []
  if (detail.data?.status === TRANSFER_STATUS.LOADING_IN_PROGRESS) {
    transferTabs.push({ value: LOADING_TAB, label: 'Loading' })
  }
  if (detail.data?.status === TRANSFER_STATUS.UNLOADING_IN_PROGRESS) {
    transferTabs.push({ value: UNLOADING_TAB, label: 'Unloading' })
  }

  return (
    <CollectionDetailPage
      section="transfers"
      titleLabel="Transfer"
      collectionId={transferNumber}
      canCreateEditEntity={canCreateEditTransfer}
      detail={detail}
      notFoundLabel="Transfer not found"
      refreshKey={transferDetailKey(transferNumber)}
      historyCacheKey={`transfer-history:${transferNumber}`}
      historyFetcher={() => getTransferHistory(transferNumber)}
      tabs={transferTabs}
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      renderTabContent={(tabValue, transfer) => {
        if (tabValue === LOADING_TAB) {
          return (
            <TransferLoadingPanel
              transferNumber={transferNumber}
              assets={transfer.assets}
              focusKey={focusNonce}
            />
          )
        }
        if (tabValue === UNLOADING_TAB) {
          return (
            <TransferUnloadingPanel
              transferNumber={transferNumber}
              assets={transfer.assets}
              focusKey={focusNonce}
            />
          )
        }
        return null
      }}
      onBulkRemove={
        canEditAssets ? (assets) => mutations.bulkRemoveAssets(transferNumber, assets) : undefined
      }
      onFlushPending={mutations.flushPending}
      onDelete={handleDelete}
      buildColumns={buildColumns}
      tableMeta={tableMeta}
      renderHeaderActions={(transfer) => (
        <TransferLifecycleActions
          status={transfer.status}
          originId={transfer.origin.id}
          destinationCode={transfer.destination.city_code}
          assetCount={transfer.assets.length}
          testedCount={transfer.assets.filter((a) => a.readiness !== UNTESTED_READINESS).length}
          pendingLoadCount={pendingLoadCountOf(transfer.assets)}
          pendingUnloadCount={pendingUnloadCountOf(transfer.assets)}
          onSchedule={() => mutations.schedule(transferNumber)}
          onStartLoading={() => mutations.startLoading(transferNumber)}
          onDepart={(costs) =>
            mutations.depart(
              transferNumber,
              transfer.assets.map((a) => a.barcode),
              costs,
            )
          }
          onStartUnloading={() => mutations.startUnloading(transferNumber)}
          onComplete={() =>
            mutations.complete(
              transferNumber,
              transfer.assets.map((a) => a.barcode),
            )
          }
        />
      )}
      getNote={(transfer) => transfer.notes}
      renderTitleBadge={(transfer) => <TransferStatusBadge status={transfer.status} />}
      renderMenuActions={(transfer) => ({
        actions: canEditAssets
          ? [
              {
                label: ADD_FROM_HOLD_LABEL,
                icon: <PlusIcon />,
                onSelect: () => setAddFromHoldOpen(true),
              },
            ]
          : [],
        dialogs: (
          <AddFromHoldModal
            open={addFromHoldOpen}
            onOpenChange={setAddFromHoldOpen}
            getAssets={() => transfer.assets}
            onAddAsset={() => {}}
            onCommitBatch={(assets) => mutations.addAssetBatch(transferNumber, assets)}
          />
        ),
      })}
      renderSummaryStrip={(transfer) => (
        <>
          <SummaryValue value={formatDate(transfer.created_at)} />
          <SummaryRoute from={transfer.origin.city_code} to={transfer.destination.city_code} />
          <SummaryValue value={<OrgName name={transfer.transporter.name} />} />
          <AssetTotalsField assets={transfer.assets} />
          <CreatedByField value={transfer.created_by} />
        </>
      )}
      renderMetadataModal={(transfer, control) => (
        <TransferEditModal
          transfer={transfer}
          control={control}
          onSaveMetadata={(metadata) => mutations.updateMetadata(transferNumber, metadata)}
          onSaveNotes={(comment) => mutations.updateNotes(transferNumber, comment)}
        />
      )}
      renderAddAssetBar={(transfer) =>
        canEditAssets && (
          <AddAssetBar
            existingAssets={transfer.assets}
            entityName="transfer"
            onAddSingle={(asset) => mutations.addAsset(transferNumber, asset)}
          />
        )
      }
      renderBulkExtraActions={({ selectedAssets, clearSelection }) => {
        if (!canReturnToOrigin) return null
        const groups: BulkExtraActionGroup[] = [
          {
            actions: [
              { label: RETURN_TO_ORIGIN_LABEL, onSelect: () => setReturnToOriginOpen(true) },
            ],
          },
        ]
        return {
          groups,
          dialogs: (
            <ReturnToOriginDialog
              assetCount={selectedAssets.length}
              open={returnToOriginOpen}
              onOpenChange={setReturnToOriginOpen}
              onConfirm={() => {
                mutations.returnToOrigin(transferNumber, selectedAssets)
                clearSelection()
              }}
            />
          ),
        }
      }}
    />
  )
}

interface TransferEditModalProps {
  transfer: TransferDetail
  control: { open: boolean; onOpenChange: (open: boolean) => void }
  onSaveMetadata: (metadata: TransferMetadataForm) => Promise<void>
  onSaveNotes: (comment: string) => Promise<void>
}

function TransferEditModal({
  transfer,
  control,
  onSaveMetadata,
  onSaveNotes,
}: TransferEditModalProps): React.JSX.Element {
  if (transfer.status === TRANSFER_STATUS.DRAFT) {
    return (
      <EditTransferMetadataModal
        open={control.open}
        onOpenChange={control.onOpenChange}
        transfer={transfer}
        onSave={onSaveMetadata}
      />
    )
  }
  return (
    <EditTransferNotesModal
      open={control.open}
      onOpenChange={control.onOpenChange}
      transfer={transfer}
      onSave={onSaveNotes}
    />
  )
}
