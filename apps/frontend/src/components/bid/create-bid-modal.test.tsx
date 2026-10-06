import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateBidModal } from './create-bid-modal'

const BID_NUMBER = 'B-0000001'

const create = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-org', () => ({ useOrgs: () => [] }))
vi.mock('@/hooks/use-bid-mutations', () => ({ useBidMutations: () => ({ create }) }))
vi.mock('@/lib/success-toast', () => ({ showEntityCreatedToast: vi.fn() }))
vi.mock('@/ui-types/bid-form-types', async () => {
  const { z } = await import('zod')
  return { BidFormSchema: z.object({}).passthrough() }
})

function renderModal() {
  const onOpenChange = vi.fn()
  const onCreated = vi.fn()
  render(<CreateBidModal open onOpenChange={onOpenChange} onCreated={onCreated} />)
  return { onOpenChange, onCreated }
}

async function goToSheetStep() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Data' }))
  return screen.findByLabelText('Pasted rows')
}

describe('CreateBidModal', () => {
  beforeEach(() => {
    create.mockReset()
    create.mockResolvedValue({ bidNumber: BID_NUMBER })
  })

  it('asks for the bid details first, then the vendor sheet', async () => {
    renderModal()
    expect(screen.queryByLabelText('Pasted rows')).not.toBeInTheDocument()
    expect(await goToSheetStep()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  it('creates the bid without rows when nothing is pasted', async () => {
    const { onCreated, onOpenChange } = renderModal()
    await goToSheetStep()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(BID_NUMBER))
    expect(create.mock.calls[0]?.[1]).toBeNull()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('counts the pasted rows and sends them with the bid', async () => {
    renderModal()
    fireEvent.change(await goToSheetStep(), {
      target: { value: 'Serial\tModel\nS1\tC3000\nS2\tC4500' },
    })
    expect(screen.getByText('2 rows, 2 columns')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => expect(create).toHaveBeenCalledOnce())
    expect(create.mock.calls[0]?.[1]).toEqual({
      headers: ['Serial', 'Model'],
      rows: [
        ['S1', 'C3000'],
        ['S2', 'C4500'],
      ],
    })
  })

  it('shows a paste error inline and blocks Submit', async () => {
    renderModal()
    fireEvent.change(await goToSheetStep(), { target: { value: 'Serial\tModel' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Paste at least one row of data')
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })

  it('goes back to the details without losing the paste', async () => {
    renderModal()
    fireEvent.change(await goToSheetStep(), { target: { value: 'Serial\nS1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: 'Add Data' })).toBeInTheDocument()
    expect(await goToSheetStep()).toHaveValue('Serial\nS1')
  })
})
