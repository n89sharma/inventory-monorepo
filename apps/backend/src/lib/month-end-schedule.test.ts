import { validate } from 'node-cron'
import { describe, expect, it } from 'vitest'
import { brandGroupOf, buildMonthEndCron, periodOf } from './month-end-schedule.js'

describe('buildMonthEndCron', () => {
  it('fires at 23:59 on the last day of the month when no day is set', () => {
    const expression = buildMonthEndCron(null)
    expect(expression).toBe('0 59 23 L * *')
    expect(validate(expression)).toBe(true)
  })

  it('fires at 23:59 on the configured day', () => {
    const expression = buildMonthEndCron(15)
    expect(expression).toBe('0 59 23 15 * *')
    expect(validate(expression)).toBe(true)
  })
})

describe('periodOf', () => {
  it('reads the month on the Toronto calendar, not UTC', () => {
    expect(periodOf(new Date('2026-10-01T03:59:00Z'))).toBe('2026-09')
    expect(periodOf(new Date('2026-10-01T04:00:00Z'))).toBe('2026-10')
  })

  it('handles the winter offset after daylight saving ends', () => {
    expect(periodOf(new Date('2027-01-01T04:59:00Z'))).toBe('2026-12')
    expect(periodOf(new Date('2027-01-01T05:00:00Z'))).toBe('2027-01')
  })
})

describe('brandGroupOf', () => {
  it('groups Canon on its normalized name', () => {
    expect(brandGroupOf('canon')).toBe('CANON')
  })

  it('puts every other brand, and a missing name, in Non-Canon', () => {
    expect(brandGroupOf('ricoh')).toBe('NON_CANON')
    expect(brandGroupOf(null)).toBe('NON_CANON')
  })
})
