import { ConcludeBidDialog } from '@/components/bid/conclude-bid-dialog'
import { LifecycleButton } from '@/components/shared/lifecycle-button'
import { BID_STATUS, type BidOutcome } from 'shared-types'

type BidLifecycleActionsProps = {
  status: string
  reviewBlockedReason: string | null
  onReview: () => Promise<void>
  onReturnToDraft: () => Promise<void>
  onSubmit: () => Promise<void>
  onConclude: (outcome: BidOutcome) => Promise<void>
}

export function BidLifecycleActions({
  status,
  reviewBlockedReason,
  onReview,
  onReturnToDraft,
  onSubmit,
  onConclude,
}: BidLifecycleActionsProps): React.JSX.Element | null {
  if (status === BID_STATUS.DRAFT) {
    return (
      <LifecycleButton
        label="Review"
        title="Send this bid for review?"
        description="Rows and pricing are locked until the bid is sent back to draft"
        onConfirm={onReview}
        disabledReason={reviewBlockedReason}
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
