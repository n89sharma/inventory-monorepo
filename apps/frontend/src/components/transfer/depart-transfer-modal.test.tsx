import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DepartTransferModal } from './depart-transfer-modal'

vi.mock('@/hooks/use-transfer-costs', () => ({
  useWarehouseTransferCosts: () => [],
  warehouseCostsOf: () => ({
    transfer_cost: 0,
    processing_cost: 0,
    tested_processing_cost: 0,
    other_cost: 0,
  }),
}))

const TODAY = new Date()

function renderModal(transferDate: Date | null) {
  const onDepart = vi.fn().mockResolvedValue(undefined)
  render(
    <DepartTransferModal
      originId={1}
      assetCount={3}
      testedCount={1}
      transferDate={transferDate}
      onDepart={onDepart}
    />,
  )
  return { onDepart }
}

describe('DepartTransferModal', () => {
  it('shows the date-change notice when the stored date differs from today', () => {
    renderModal(new Date('2020-01-01'))

    fireEvent.click(screen.getByRole('button', { name: 'Depart' }))

    expect(screen.getByText(/Transfer date will change from/)).toBeInTheDocument()
  })

  it('hides the notice when the stored date is today', () => {
    renderModal(TODAY)

    fireEvent.click(screen.getByRole('button', { name: 'Depart' }))

    expect(screen.queryByText(/Transfer date will change from/)).not.toBeInTheDocument()
  })
})
