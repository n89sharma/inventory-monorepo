import { TooltipProvider } from '@/components/shadcn/tooltip'
import { render, screen } from '@testing-library/react'
import { BID_STATUS } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { BidLifecycleActions } from './bid-lifecycle-actions'

const NOOP_ASYNC = async () => {}

function renderActions(status: string, reviewBlockedReason: string | null = null) {
  return render(
    <BidLifecycleActions
      status={status}
      reviewBlockedReason={reviewBlockedReason}
      onReview={NOOP_ASYNC}
      onReturnToDraft={NOOP_ASYNC}
      onSubmit={NOOP_ASYNC}
      onConclude={NOOP_ASYNC}
    />,
    { wrapper: TooltipProvider },
  )
}

describe('BidLifecycleActions', () => {
  it('offers Review on a fully priced draft', () => {
    renderActions(BID_STATUS.DRAFT)
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled()
  })

  it('disables a plain Review button while review is blocked', () => {
    renderActions(BID_STATUS.DRAFT, 'Price every row before review')
    expect(screen.getByRole('button', { name: 'Review' })).toBeDisabled()
  })

  it('offers Back to Draft and Submit while in review', () => {
    renderActions(BID_STATUS.REVIEW)
    expect(screen.getByRole('button', { name: 'Back to Draft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Review/ })).not.toBeInTheDocument()
  })

  it('offers Won/Lost once submitted', () => {
    renderActions(BID_STATUS.SUBMITTED)
    expect(screen.getByRole('button', { name: 'Won/Lost' })).toBeInTheDocument()
  })

  it('offers nothing once concluded', () => {
    const { container } = renderActions(BID_STATUS.CONCLUDED)
    expect(container).toBeEmptyDOMElement()
  })
})
