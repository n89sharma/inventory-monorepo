import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleTransferModal } from './schedule-transfer-modal'

function renderModal() {
  const onSchedule = vi.fn().mockResolvedValue(undefined)
  render(<ScheduleTransferModal label="Schedule" disabled={false} onSchedule={onSchedule} />)
  return { onSchedule }
}

describe('ScheduleTransferModal', () => {
  it('calls onSchedule with the default (today) date on submit', async () => {
    const { onSchedule } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    await vi.waitFor(() => expect(onSchedule).toHaveBeenCalled())
  })
})
