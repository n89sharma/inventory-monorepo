import { addDays, subDays, subMonths, subYears } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_DEPARTED_WINDOW_MONTHS } from 'shared-types'
import { getDepartedFloor, isValidDepartedDateRange } from './hooks'

const NOW = new Date(2026, 6, 27)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

// This is the gate that decides whether the departed search fires at all: when it returns
// false, useSearchDeparted nulls its SWR key and no request is made.
describe('isValidDepartedDateRange', () => {
  it('accepts a range starting inside the window', () => {
    expect(isValidDepartedDateRange(addDays(getDepartedFloor(), 1), NOW)).toBe(true)
  })

  it('rejects a range starting before the floor', () => {
    expect(isValidDepartedDateRange(subDays(getDepartedFloor(), 1), NOW)).toBe(false)
  })

  it('rejects a from date after the to date, inside the window', () => {
    expect(isValidDepartedDateRange(NOW, subDays(NOW, 1))).toBe(false)
  })

  // Only `from` is constrained — nothing can depart in the future, so a to date past today
  // is harmless and the profitability drill-down relies on it for the current month.
  it('accepts a to date in the future', () => {
    expect(isValidDepartedDateRange(subDays(NOW, 30), addDays(NOW, 90))).toBe(true)
  })

  it('reaches back two years', () => {
    expect(MAX_DEPARTED_WINDOW_MONTHS).toBe(24)
    expect(getDepartedFloor()).toEqual(subMonths(NOW, MAX_DEPARTED_WINDOW_MONTHS))
    expect(isValidDepartedDateRange(subYears(NOW, 2), NOW)).toBe(true)
  })
})
