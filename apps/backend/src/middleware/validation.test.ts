import { describe, expect, it } from 'vitest'
import { ArrivalListQuerySchema } from './validation.js'

const VALID_QUERY = { fromDate: '2026-06-01', toDate: '2026-06-25' }

describe('ArrivalListQuerySchema', () => {
  it('accepts a date-only range and widens it to whole days', () => {
    const result = ArrivalListQuerySchema.parse(VALID_QUERY)
    expect(result.fromDate.getDate()).toBe(1)
    expect(result.fromDate.getHours()).toBe(0)
    expect(result.toDate.getDate()).toBe(25)
    expect(result.toDate.getHours()).toBe(23)
  })

  it('defaults an omitted toDate to the end of today', () => {
    const result = ArrivalListQuerySchema.parse({ fromDate: '2026-06-01' })
    expect(result.toDate.getDate()).toBe(new Date().getDate())
  })

  it.each([
    ['a full timestamp', '2026-06-25T10:00:00.000Z'],
    ['an unpadded date', '2026-6-5'],
    ['a non-date', 'garbage'],
    ['an empty string', ''],
  ])('rejects %s', (_label, fromDate) => {
    expect(ArrivalListQuerySchema.safeParse({ ...VALID_QUERY, fromDate }).success).toBe(false)
  })

  it('rejects a range that ends before it starts', () => {
    const result = ArrivalListQuerySchema.safeParse({
      fromDate: '2026-06-25',
      toDate: '2026-06-01',
    })
    expect(result.success).toBe(false)
  })
})
