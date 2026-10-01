import { ConcludeBidDialog } from '@/components/bid/conclude-bid-dialog'
import { LifecycleButton } from '@/components/shared/lifecycle-button'
import { BID_STATUS, type BidOutcome } from 'shared-types'

function reviewBlockedLabel(rowCount: number, unpricedCount: number): string {
  if (rowCount === 0) return ' (no rows)'
  if (unpricedCount > 0) return ` (${unpricedCount} unpriced)`
  return ''
}

type BidLifecycleActionsProps = {
  status: string
  rowCount: number
  unpricedCount: number
  onReview: () => Promise<void>
  onReturnToDraft: () => Promise<void>
  onSubmit: () => Promise<void>
  onConclude: (outcome: BidOutcome) => Promise<void>
}

export function BidLifecycleActions({
  status,
  rowCount,
  unpricedCount,
  onReview,
  onReturnToDraft,
  onSubmit,
  onConclude,
}: BidLifecycleActionsProps): React.JSX.Element | null {
  if (status === BID_STATUS.DRAFT) {
    const blockedLabel = reviewBlockedLabel(rowCount, unpricedCount)
    return (
      <LifecycleButton
        label={`Review${blockedLabel}`}
        title="Send this bid for review?"
        description="Rows and pricing are locked until the bid is sent back to draft"
        onConfirm={onReview}
        disabled={blockedLabel !== ''}
      />
    )
  }

  if (status === BID_STATUS.REVIEW) {
    return (
      <div className="flex items-center gap-2">
        <LifecycleButton
          label="Back to Draft"
          title="Send this bid back to draft?"
          description="Rows and pricing can be edited again"
          onConfirm={onReturnToDraft}
        />
        <LifecycleButton
          label="Submit"
          title="Submit this bid?"
          description="The bid is locked and ready to send to the vendor"
          onConfirm={onSubmit}
        />
      </div>
    )
  }

  if (status === BID_STATUS.SUBMITTED) {
    return <ConcludeBidDialog onConclude={onConclude} />
  }

  return null
}
