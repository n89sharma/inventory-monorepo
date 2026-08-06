import { describe, expect, it } from 'vitest'
import { normalizeFromDate, normalizeToDate } from './date-range.js'

const DATE_ONLY = '2026-06-25'
const YEAR = 2026
const JUNE = 5
const DAY = 25

describe('normalizeFromDate', () => {
  it('returns the start of the given day', () => {
    const result = normalizeFromDate(DATE_ONLY)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  // `new Date('2026-06-25')` lands on UTC midnight, which startOfDay then pulls back
  // to the 24th on any negative-offset server.
  it('keeps the calendar day the caller asked for', () => {
    const result = normalizeFromDate(DATE_ONLY)
    expect(result.getFullYear()).toBe(YEAR)
    expect(result.getMonth()).toBe(JUNE)
    expect(result.getDate()).toBe(DAY)
  })
})

describe('normalizeToDate', () => {
  it('returns the end of the given day', () => {
    const result = normalizeToDate(DATE_ONLY)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
    expect(result.getMilliseconds()).toBe(999)
  })

  it('keeps the calendar day the caller asked for', () => {
    const result = normalizeToDate(DATE_ONLY)
    expect(result.getFullYear()).toBe(YEAR)
    expect(result.getMonth()).toBe(JUNE)
    expect(result.getDate()).toBe(DAY)
  })

  it('ends today when no date is given', () => {
    const result = normalizeToDate()
    const today = new Date()
    expect(result.getFullYear()).toBe(today.getFullYear())
    expect(result.getMonth()).toBe(today.getMonth())
    expect(result.getDate()).toBe(today.getDate())
    expect(result.getHours()).toBe(23)
  })
})
