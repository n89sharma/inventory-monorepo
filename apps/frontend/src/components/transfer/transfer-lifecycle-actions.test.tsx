import { render, screen } from '@testing-library/react'
import { TRANSFER_STATUS } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { TransferLifecycleActions } from './transfer-lifecycle-actions'

vi.mock('@/hooks/use-can', () => ({
  useCan: (permission?: string) =>
    permission !== 'edit_prices' && permission !== 'view_purchase_price',
}))

const NOOP_ASYNC = async () => {}

function renderActions(
  status: string,
  overrides: { assetCount?: number; pendingLoadCount?: number; pendingUnloadCount?: number } = {},
) {
  return render(
    <TransferLifecycleActions
      status={status}
      originId={1}
      destinationCode="YYZ"
      assetCount={overrides.assetCount ?? 3}
      testedCount={1}
      transferDate={null}
      pendingLoadCount={overrides.pendingLoadCount ?? 0}
      pendingUnloadCount={overrides.pendingUnloadCount ?? 0}
      onSchedule={NOOP_ASYNC}
      onStartLoading={NOOP_ASYNC}
      onDepart={async () => {}}
      onStartUnloading={NOOP_ASYNC}
      onComplete={NOOP_ASYNC}
    />,
  )
}

describe('TransferLifecycleActions', () => {
  it('renders an enabled Schedule for a Draft transfer with assets', () => {
    renderActions(TRANSFER_STATUS.DRAFT)
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeEnabled()
  })

  it('disables Schedule for a Draft transfer with no assets', () => {
    renderActions(TRANSFER_STATUS.DRAFT, { assetCount: 0 })
    expect(screen.getByRole('button', { name: 'Schedule (no assets)' })).toBeDisabled()
  })

  it('renders Start Loading for a Scheduled transfer', () => {
    renderActions(TRANSFER_STATUS.SCHEDULED)
    expect(screen.getByRole('button', { name: 'Start Loading' })).toBeInTheDocument()
  })

  it('renders Start Unloading for an In Transit transfer', () => {
    renderActions(TRANSFER_STATUS.IN_TRANSIT)
    expect(screen.getByRole('button', { name: 'Start Unloading' })).toBeInTheDocument()
  })

  it('renders nothing for a Complete transfer', () => {
    const { container } = renderActions(TRANSFER_STATUS.COMPLETE)
    expect(container).toBeEmptyDOMElement()
  })

  it('disables Depart until every asset is loaded or missing', () => {
    renderActions(TRANSFER_STATUS.LOADING_IN_PROGRESS, { pendingLoadCount: 2 })
    expect(screen.getByRole('button', { name: /Depart/ })).toBeDisabled()
  })

  it('enables Depart once the pending pane is empty', () => {
    renderActions(TRANSFER_STATUS.LOADING_IN_PROGRESS, { pendingLoadCount: 0 })
    expect(screen.getByRole('button', { name: 'Depart' })).toBeEnabled()
  })

  it('disables Complete until every traveled asset is unloaded or missing', () => {
    renderActions(TRANSFER_STATUS.UNLOADING_IN_PROGRESS, { pendingUnloadCount: 1 })
    expect(screen.getByRole('button', { name: /Complete/ })).toBeDisabled()
  })

  it('enables Complete once the pending pane is empty', () => {
    renderActions(TRANSFER_STATUS.UNLOADING_IN_PROGRESS, { pendingUnloadCount: 0 })
    expect(screen.getByRole('button', { name: 'Complete' })).toBeEnabled()
  })
})
