import { DepartTransferModal } from '@/components/transfer/depart-transfer-modal'
import { ScheduleTransferModal } from '@/components/transfer/schedule-transfer-modal'
import { LifecycleButton } from '@/components/shared/lifecycle-button'
import { useCan } from '@/hooks/use-can'
import { TRANSFER_STATUS, type TransferCosts } from 'shared-types'

type DepartActionProps = {
  originId: number
  assetCount: number
  testedCount: number
  transferDate: Date | null
  pendingLoadCount: number
  onDepart: (costs: TransferCosts | null) => Promise<void>
}

// Choosing the amounts is a price edit; everyone else departs on the warehouse defaults.
function DepartAction({
  originId,
  assetCount,
  testedCount,
  transferDate,
  pendingLoadCount,
  onDepart,
}: DepartActionProps): React.JSX.Element {
  const canEditPrices = useCan('edit_prices')
  const canViewPurchasePrice = useCan('view_purchase_price')
  const disabled = pendingLoadCount > 0
  const remainingLabel = disabled ? ` (${pendingLoadCount} remaining)` : ''

  if (canEditPrices && canViewPurchasePrice) {
    return (
      <DepartTransferModal
        originId={originId}
        assetCount={assetCount}
        testedCount={testedCount}
        transferDate={transferDate}
        disabled={disabled}
        onDepart={onDepart}
      />
    )
  }

  return (
    <LifecycleButton
      label={`Depart${remainingLabel}`}
      title="Depart this transfer?"
      description="All assets in the transfer will be marked as being in transit"
      onConfirm={() => onDepart(null)}
      disabled={disabled}
    />
  )
}

type TransferLifecycleActionsProps = {
  status: string
  originId: number
  destinationCode: string
  assetCount: number
  testedCount: number
  transferDate: Date | null
  pendingLoadCount: number
  pendingUnloadCount: number
  onSchedule: (transferDate: string) => Promise<void>
  onStartLoading: () => Promise<void>
  onDepart: (costs: TransferCosts | null) => Promise<void>
  onStartUnloading: () => Promise<void>
  onComplete: () => Promise<void>
}

export function TransferLifecycleActions({
  status,
  originId,
  destinationCode,
  assetCount,
  testedCount,
  transferDate,
  pendingLoadCount,
  pendingUnloadCount,
  onSchedule,
  onStartLoading,
  onDepart,
  onStartUnloading,
  onComplete,
}: TransferLifecycleActionsProps): React.JSX.Element | null {
  const canCreateEditTransfer = useCan('create_update_transfer')
  if (!canCreateEditTransfer) return null

  if (status === TRANSFER_STATUS.DRAFT) {
    return <ScheduleTransferModal onSchedule={onSchedule} />
  }

  if (status === TRANSFER_STATUS.SCHEDULED) {
    return (
      <LifecycleButton
        label="Start Loading"
        title="Start loading this transfer?"
        onConfirm={onStartLoading}
      />
    )
  }

  if (status === TRANSFER_STATUS.LOADING_IN_PROGRESS) {
    return (
      <DepartAction
        originId={originId}
        assetCount={assetCount}
        testedCount={testedCount}
        transferDate={transferDate}
        pendingLoadCount={pendingLoadCount}
        onDepart={onDepart}
      />
    )
  }

  if (status === TRANSFER_STATUS.IN_TRANSIT) {
    return (
      <LifecycleButton
        label="Start Unloading"
        title="Start unloading this transfer?"
        onConfirm={onStartUnloading}
      />
    )
  }

  if (status === TRANSFER_STATUS.UNLOADING_IN_PROGRESS) {
    const disabled = pendingUnloadCount > 0
    const remainingLabel = disabled ? ` (${pendingUnloadCount} remaining)` : ''
    return (
      <LifecycleButton
        label={`Complete${remainingLabel}`}
        title="Mark this transfer as received?"
        description={`Receive ${assetCount} asset(s) in ${destinationCode} shipping & receiving area?`}
        onConfirm={onComplete}
        disabled={disabled}
      />
    )
  }

  return null
}
