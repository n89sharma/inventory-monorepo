import { MeterBandFilter } from '@/components/shared/filters/meter-band-filter'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const ALL_BUTTON = { name: 'Select all meter bands' }
const MEDIUM_BUTTON = { name: 'Filter by meter band 70-210K' }

describe('MeterBandFilter', () => {
  it('shows All pressed when no band is selected', () => {
    render(<MeterBandFilter selection={null} onSelectionChange={vi.fn()} />)
    expect(screen.getByRole('button', ALL_BUTTON)).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', MEDIUM_BUTTON)).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the band a user picks, and none when they pick All', () => {
    const onSelectionChange = vi.fn()
    render(<MeterBandFilter selection="MEDIUM" onSelectionChange={onSelectionChange} />)
    expect(screen.getByRole('button', MEDIUM_BUTTON)).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Filter by meter band 210K+' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith('HIGH')

    fireEvent.click(screen.getByRole('button', ALL_BUTTON))
    expect(onSelectionChange).toHaveBeenLastCalledWith(null)
  })
})
