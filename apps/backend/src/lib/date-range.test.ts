import { describe, expect, it } from 'vitest'
import { normalizeFromDate, normalizeToDate } from './date-range.js'

describe('normalizeFromDate', () => {
  it('returns the start of the given day', () => {
    const result = normalizeFromDate('2026-06-25')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })
})

describe('normalizeToDate', () => {
  it('returns the end of the given day', () => {
    const result = normalizeToDate('2026-06-25')
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
    expect(result.getMilliseconds()).toBe(999)
  })
})
