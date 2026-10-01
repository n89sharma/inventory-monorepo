import { render, screen } from '@testing-library/react'
import { BID_STATUS } from 'shared-types'
import { describe, expect, it } from 'vitest'
import { BidLifecycleActions } from './bid-lifecycle-actions'

const NOOP_ASYNC = async () => {}

function renderActions(status: string, rowCount = 3, unpricedCount = 0) {
  return render(
    <BidLifecycleActions
      status={status}
      rowCount={rowCount}
      unpricedCount={unpricedCount}
      onReview={NOOP_ASYNC}
      onReturnToDraft={NOOP_ASYNC}
      onSubmit={NOOP_ASYNC}
      onConclude={NOOP_ASYNC}
    />,
  )
}

describe('BidLifecycleActions', () => {
  it('offers Review on a fully priced draft', () => {
    renderActions(BID_STATUS.DRAFT)
    expect(screen.getByRole('button', { name: 'Review' })).toBeEnabled()
  })

  it('disables Review with the unpriced count while rows are unpriced', () => {
    renderActions(BID_STATUS.DRAFT, 3, 2)
    expect(screen.getByRole('button', { name: 'Review (2 unpriced)' })).toBeDisabled()
  })

  it('disables Review on a draft with no rows', () => {
    renderActions(BID_STATUS.DRAFT, 0, 0)
    expect(screen.getByRole('button', { name: 'Review (no rows)' })).toBeDisabled()
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
