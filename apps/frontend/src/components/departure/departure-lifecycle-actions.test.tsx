import { render, screen } from '@testing-library/react'
import { DEPARTURE_STATUS } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { DepartureLifecycleActions } from './departure-lifecycle-actions'

const mocks = vi.hoisted(() => ({ allowed: true }))

vi.mock('@/hooks/use-can', () => ({
  useCan: () => mocks.allowed,
}))

const NOOP_ASYNC = async () => {}

function renderActions(status: string, pendingLoadCount = 0, assetCount = 3) {
  return render(
    <DepartureLifecycleActions
      status={status}
      assetCount={assetCount}
      pendingLoadCount={pendingLoadCount}
      onSchedule={NOOP_ASYNC}
      onStartLoading={NOOP_ASYNC}
      onFinishLoading={NOOP_ASYNC}
      onComplete={NOOP_ASYNC}
    />,
  )
}

describe('DepartureLifecycleActions', () => {
  it('renders Schedule for a Draft departure', () => {
    mocks.allowed = true
    renderActions(DEPARTURE_STATUS.DRAFT)
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeEnabled()
  })

  it('disables Schedule for a Draft departure with no assets', () => {
    mocks.allowed = true
    renderActions(DEPARTURE_STATUS.DRAFT, 0, 0)
    expect(screen.getByRole('button', { name: 'Schedule (no assets)' })).toBeDisabled()
  })

  it('renders Start Loading for a Scheduled departure', () => {
    mocks.allowed = true
    renderActions(DEPARTURE_STATUS.SCHEDULED)
    expect(screen.getByRole('button', { name: 'Start Loading' })).toBeInTheDocument()
  })

  it('disables Finish Loading with the remaining count until every asset is loaded or missing', () => {
    mocks.allowed = true
    renderActions(DEPARTURE_STATUS.LOADING_IN_PROGRESS, 2)
    expect(screen.getByRole('button', { name: 'Finish Loading (2 remaining)' })).toBeDisabled()
  })

  it('enables Finish Loading once nothing is pending', () => {
    mocks.allowed = true
    renderActions(DEPARTURE_STATUS.LOADING_IN_PROGRESS, 0)
    expect(screen.getByRole('button', { name: 'Finish Loading' })).toBeEnabled()
  })

  it('renders Complete for a Loaded departure', () => {
    mocks.allowed = true
    renderActions(DEPARTURE_STATUS.LOADED)
    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument()
  })

  it('renders nothing for a Completed departure', () => {
    mocks.allowed = true
    const { container } = renderActions(DEPARTURE_STATUS.COMPLETE)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing without the create/update departure permission', () => {
    mocks.allowed = false
    const { container } = renderActions(DEPARTURE_STATUS.DRAFT)
    expect(container).toBeEmptyDOMElement()
  })
})
