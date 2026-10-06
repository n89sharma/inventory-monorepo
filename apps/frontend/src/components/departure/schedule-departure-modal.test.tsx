import { fireEvent, render, screen, within } from '@testing-library/react'
import { formatDateParam } from '@/lib/date-param'
import { startOfDay } from 'date-fns'
import { describe, expect, it, vi } from 'vitest'
import { ScheduleDepartureModal } from './schedule-departure-modal'

describe('ScheduleDepartureModal', () => {
  it('submits today as the ISO day by default', async () => {
    const onSchedule = vi.fn().mockResolvedValue(undefined)
    render(<ScheduleDepartureModal label="Schedule" disabled={false} onSchedule={onSchedule} />)

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    await vi.waitFor(() =>
      expect(onSchedule).toHaveBeenCalledWith(formatDateParam(startOfDay(new Date()))),
    )
  })

  it('labels the date as the departure date', async () => {
    render(<ScheduleDepartureModal label="Schedule" disabled={false} onSchedule={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    const dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('button', { name: /Departure Date/ })).toBeInTheDocument()
  })
})
