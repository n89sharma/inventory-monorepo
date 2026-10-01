import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BID_OUTCOME } from 'shared-types'
import { describe, expect, it, vi } from 'vitest'
import { ConcludeBidDialog } from './conclude-bid-dialog'

function openDialog(onConclude = vi.fn().mockResolvedValue(undefined)) {
  render(<ConcludeBidDialog onConclude={onConclude} />)
  fireEvent.click(screen.getByRole('button', { name: 'Won/Lost' }))
  return onConclude
}

describe('ConcludeBidDialog', () => {
  it('selects Won by default', async () => {
    openDialog()
    expect(await screen.findByRole('radio', { name: 'Won' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('confirms the chosen outcome', async () => {
    const onConclude = openDialog()
    fireEvent.click(await screen.findByRole('radio', { name: 'Lost' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(onConclude).toHaveBeenCalledWith(BID_OUTCOME.LOST))
  })

  it('sends nothing on cancel', async () => {
    const onConclude = openDialog()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(onConclude).not.toHaveBeenCalled()
  })
})
