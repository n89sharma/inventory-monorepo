import { describe, expect, it } from 'vitest'
import type { Brand, Warehouse } from 'shared-types'
import { departedDrilldownHref } from './serializers'

const ORIGIN = 'https://loon.test'

const JUNE_FIRST = new Date(2026, 5, 1)
const JUNE_LAST = new Date(2026, 5, 30)

const warehouse = (id: number): Warehouse => ({
  id,
  city_code: `WH${id}`,
  street: `${id} Main St`,
  is_active: true,
})

const CANON: Brand = { id: 7, name: 'CANON' }

function parse(href: string): URL {
  return new URL(href, ORIGIN)
}

describe('departedDrilldownHref', () => {
  it('targets the departed search page', () => {
    expect(parse(departedDrilldownHref(JUNE_FIRST, JUNE_LAST, [], null)).pathname).toBe(
      '/search/departed',
    )
  })

  // The range is a pair of calendar days, so it must survive serialization without a
  // timezone shift — an off-by-one here silently moves the window by a day.
  it('writes the range as local calendar days', () => {
    const params = parse(departedDrilldownHref(JUNE_FIRST, JUNE_LAST, [], null)).searchParams
    expect(params.get('from')).toBe('2026-06-01')
    expect(params.get('to')).toBe('2026-06-30')
  })

  it('joins the selected warehouse ids', () => {
    const params = parse(
      departedDrilldownHref(JUNE_FIRST, JUNE_LAST, [warehouse(3), warehouse(5)], null),
    ).searchParams
    expect(params.get('wh')).toBe('3,5')
  })

  // No warehouse param is how every page spells "all warehouses".
  it('omits the warehouse param when none are selected', () => {
    const params = parse(departedDrilldownHref(JUNE_FIRST, JUNE_LAST, [], null)).searchParams
    expect(params.has('wh')).toBe(false)
  })

  it('carries the brand as its id, and omits it when unset', () => {
    const withBrand = parse(departedDrilldownHref(JUNE_FIRST, JUNE_LAST, [], CANON)).searchParams
    expect(withBrand.get('brand')).toBe('7')

    const withoutBrand = parse(departedDrilldownHref(JUNE_FIRST, JUNE_LAST, [], null)).searchParams
    expect(withoutBrand.has('brand')).toBe(false)
  })
})
