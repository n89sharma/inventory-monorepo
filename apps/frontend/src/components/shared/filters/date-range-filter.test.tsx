import { DateRangeFilter } from '@/components/shared/filters/date-range-filter'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const COMMITTED_FROM = new Date(2026, 2, 2)
const COMMITTED_TO = new Date(2026, 2, 20)
const TRIGGER = { name: /Mar 0?2, 2026/ }

function renderFilter(onChange = vi.fn()) {
  render(
    <DateRangeFilter
      id="range"
      from={COMMITTED_FROM}
      to={COMMITTED_TO}
      onChange={onChange}
      disabled={{ after: new Date(2026, 2, 25) }}
    />,
  )
  return onChange
}

function openCalendar() {
  fireEvent.click(screen.getByRole('button', TRIGGER))
}

function day(dayOfMonth: number): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`March ${dayOfMonth}\\w\\w, 2026`) })
}

function clickDay(dayOfMonth: number) {
  fireEvent.click(day(dayOfMonth))
}

describe('DateRangeFilter', () => {
  it('opens on the committed range', () => {
    renderFilter()
    openCalendar()
    expect(day(2)).toHaveAttribute('data-range-start', 'true')
    expect(day(20)).toHaveAttribute('data-range-end', 'true')
  })

  it('reports nothing after the first click and stays open', () => {
    const onChange = renderFilter()
    openCalendar()
    clickDay(10)
    expect(onChange).not.toHaveBeenCalled()
    expect(day(10)).toBeInTheDocument()
  })

  it('reports both dates once on the second click and closes', () => {
    const onChange = renderFilter()
    openCalendar()
    clickDay(10)
    clickDay(16)
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 10), new Date(2026, 2, 16))
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('orders the range when the second click is earlier', () => {
    const onChange = renderFilter()
    openCalendar()
    clickDay(16)
    clickDay(10)
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 10), new Date(2026, 2, 16))
  })

  it('reports a one-day range when the same day is clicked twice', () => {
    const onChange = renderFilter()
    openCalendar()
    clickDay(12)
    clickDay(12)
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 12), new Date(2026, 2, 12))
  })

  it('discards a half-picked range when closed', () => {
    const onChange = renderFilter()
    openCalendar()
    clickDay(10)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()

    openCalendar()
    expect(onChange).not.toHaveBeenCalled()
    expect(day(2)).toHaveAttribute('data-range-start', 'true')
    expect(day(20)).toHaveAttribute('data-range-end', 'true')
  })

  it('does not offer disabled days', () => {
    renderFilter()
    openCalendar()
    expect(day(28)).toBeDisabled()
  })
})
