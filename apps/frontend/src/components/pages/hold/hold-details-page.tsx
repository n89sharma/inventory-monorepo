import { HoldSummaryStrip } from '@/components/custom/cards/hold-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { ConfirmActionDialog } from '@/components/custom/confirm-action-dialog'
import { StatusBadge } from '@/components/custom/status-badge'
import { getHoldHistory } from '@/data/api/hold-api'
import { formatDate } from '@/lib/formatters'
import { holdDetailKey, useHoldDetail } from '@/hooks/use-hold'
import { useHoldMutations } from '@/hooks/use-hold-mutations'
import { useCan } from '@/hooks/use-can'
import { useAuth } from '@clerk/react'
import { LockSimpleOpenIcon } from '@phosphor-icons/react'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { AssetSummary } from 'shared-types'
import { AlertDialogDescription } from '../../shadcn/alert-dialog'
import { AddAssetBar } from '../../custom/add-asset-bar'
import { EditHoldMetadataModal } from '../../modals/edit-hold-metadata-modal'
import { CollectionDetailPage } from '../collection-detail-page'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

const RELEASED_STATUS = 'RELEASED'

export function HoldDetailsPage(): React.JSX.Element {
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()
  if (holdNumber === undefined) throw new Error('Missing collectionId parameter')

  const mutations = useHoldMutations()
  const detail = useHoldDetail(holdNumber)
  const { userId: clerkUserId } = useAuth()
  const canEditAny = useCan('edit_any_hold')
  const [releaseOpen, setReleaseOpen] = useState(false)

  const isArchived = detail.data?.archived_at != null

  const canEditHold = detail.data
    ? !isArchived &&
      (canEditAny || (clerkUserId != null && detail.data.created_by.clerk_id === clerkUserId))
    : false

  const handleRelease = async () => {
    try {
      await mutations.archive(holdNumber)
      toast.success('Hold released. All assets returned to stock.', { position: 'top-center' })
    } catch {
      toast.error('Failed to release hold', { position: 'top-center' })
    } finally {
      setReleaseOpen(false)
    }
  }

  const assetCount = detail.data?.assets.length ?? 0

  const buildColumns = useCallback(
    (assetHref: (asset: AssetSummary) => string) =>
      createAssetSummaryColumns(
        assetHref,
        canEditHold ? (asset) => mutations.removeAsset(holdNumber, asset) : undefined,
      ),
    [mutations, holdNumber, canEditHold],
  )

  return (
    <>
      <CollectionDetailPage
        section="holds"
        titleLabel="Hold"
        collectionId={holdNumber}
        permission="create_update_hold"
        canEditEntity={canEditHold}
        detail={detail}
        notFoundLabel="Hold not found"
        refreshKey={holdDetailKey(holdNumber)}
        historyCacheKey={`hold-history:${holdNumber}`}
        historyFetcher={() => getHoldHistory(holdNumber)}
        onBulkRemove={(assets) => mutations.bulkRemoveAssets(holdNumber, assets)}
        onFlushPending={mutations.flushPending}
        onRelease={() => setReleaseOpen(true)}
        buildColumns={buildColumns}
        renderSummaryStrip={(hold) => <HoldSummaryStrip hold={hold} />}
        renderSubtitle={(hold) => (
          <>
            <SummaryField label="Customer" value={hold.customer.name} />
            <SummaryField label="For" value={hold.created_for.name} />
            {hold.to_dt && <SummaryField label="To" value={formatDate(hold.to_dt)} />}
            {hold.archived_at && <StatusBadge status={RELEASED_STATUS} />}
          </>
        )}
        renderMetadataModal={(hold, control) => (
          <EditHoldMetadataModal
            open={control.open}
            onOpenChange={control.onOpenChange}
            hold={hold}
            onSave={(metadata) => mutations.updateMetadata(holdNumber, metadata)}
          />
        )}
        renderAddAssetBar={(hold) => (
          <AddAssetBar
            existingAssets={hold.assets}
            entityName="hold"
            onAddSingle={(asset) => mutations.addAsset(holdNumber, asset)}
            validateAsset={(asset) =>
              asset.hold_number ? `Asset ${asset.barcode} is already on a hold.` : null
            }
          />
        )}
      />
      <ConfirmActionDialog
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        title={`Release hold ${holdNumber}?`}
        confirmLabel="Release"
        icon={<LockSimpleOpenIcon />}
        onConfirm={handleRelease}
      >
        <AlertDialogDescription>
          Releasing returns all {assetCount} asset{assetCount !== 1 ? 's' : ''} to stock and closes
          this hold. This cannot be undone.
        </AlertDialogDescription>
      </ConfirmActionDialog>
    </>
  )
}
