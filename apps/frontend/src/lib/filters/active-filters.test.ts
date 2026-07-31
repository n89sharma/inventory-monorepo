import { describe, expect, it } from 'vitest'
import { countActiveFilterGroups, type FilterParamGroups } from './hooks'

const METER_RANGE_GROUPS = [['meter_min', 'meter_max']] as const satisfies FilterParamGroups
const MODEL_GROUPS = [['model', 'q']] as const satisfies FilterParamGroups
const SCOPE_GROUPS = [['wh'], ['pricecheck'], ['brand']] as const satisfies FilterParamGroups

describe('countActiveFilterGroups', () => {
  it('counts nothing when every param is absent', () => {
    expect(countActiveFilterGroups(SCOPE_GROUPS, { wh: null, pricecheck: null, brand: null })).toBe(
      0,
    )
  })

  // A control owning two params is one filter to the user, however many of its params are set.
  it('counts a two-param control once', () => {
    expect(countActiveFilterGroups(METER_RANGE_GROUPS, { meter_min: 100, meter_max: null })).toBe(1)
    expect(countActiveFilterGroups(METER_RANGE_GROUPS, { meter_min: 100, meter_max: 900 })).toBe(1)
    expect(countActiveFilterGroups(MODEL_GROUPS, { model: null, q: 'ir-2020' })).toBe(1)
  })

  it('counts each populated control separately', () => {
    expect(countActiveFilterGroups(SCOPE_GROUPS, { wh: [1], pricecheck: true, brand: 7 })).toBe(3)
  })

  // An empty list or string is what a cleared control leaves behind, not an applied filter.
  it('ignores empty lists and empty strings', () => {
    expect(countActiveFilterGroups([['wh']], { wh: [] })).toBe(0)
    expect(countActiveFilterGroups([['invoiceref']], { invoiceref: '' })).toBe(0)
    expect(countActiveFilterGroups([['invoiceref']], { invoiceref: 'INV-1' })).toBe(1)
  })

  it('ignores a flag that is off', () => {
    expect(countActiveFilterGroups([['pricecheck']], { pricecheck: false })).toBe(0)
    expect(countActiveFilterGroups([['pricecheck']], { pricecheck: true })).toBe(1)
  })

  // Zero is a real meter bound, not an absent one.
  it('counts zero as an applied value', () => {
    expect(countActiveFilterGroups(METER_RANGE_GROUPS, { meter_min: 0, meter_max: null })).toBe(1)
  })
})
