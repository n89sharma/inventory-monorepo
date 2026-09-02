import { describe, expect, it } from 'vitest'
import type { Brand, OrgDetail, User, Warehouse } from 'shared-types'
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

const ACME: OrgDetail = {
  id: 12,
  account_number: 'ACME',
  name: 'Acme Corp',
  contact_name: null,
  phone: null,
  mobile: null,
  primary_email: null,
  address: null,
  city: null,
  province: null,
  country: null,
}

const DANA: User = {
  id: 21,
  name: 'Dana',
  email: null,
  is_active: true,
  role: 'member',
  clerk_id: null,
  default_warehouse_id: null,
}

const NOTHING_SELECTED = {
  from: JUNE_FIRST,
  to: JUNE_LAST,
  warehouses: [],
  brand: null,
  customer: null,
  salesperson: null,
}

function parse(href: string): URL {
  return new URL(href, ORIGIN)
}

describe('departedDrilldownHref', () => {
  it('targets the departed search page', () => {
    expect(parse(departedDrilldownHref(NOTHING_SELECTED)).pathname).toBe('/search/departed')
  })

  // The range is a pair of calendar days, so it must survive serialization without a
  // timezone shift — an off-by-one here silently moves the window by a day.
  it('writes the range as local calendar days', () => {
    const params = parse(departedDrilldownHref(NOTHING_SELECTED)).searchParams
    expect(params.get('from')).toBe('2026-06-01')
    expect(params.get('to')).toBe('2026-06-30')
  })

  it('joins the selected warehouse ids', () => {
    const params = parse(
      departedDrilldownHref({ ...NOTHING_SELECTED, warehouses: [warehouse(3), warehouse(5)] }),
    ).searchParams
    expect(params.get('wh')).toBe('3,5')
  })

  // No warehouse param is how every page spells "all warehouses".
  it('omits the warehouse param when none are selected', () => {
    const params = parse(departedDrilldownHref(NOTHING_SELECTED)).searchParams
    expect(params.has('wh')).toBe(false)
  })

  it('carries the brand as its id, and omits it when unset', () => {
    const withBrand = parse(
      departedDrilldownHref({ ...NOTHING_SELECTED, brand: CANON }),
    ).searchParams
    expect(withBrand.get('brand')).toBe('7')

    const withoutBrand = parse(departedDrilldownHref(NOTHING_SELECTED)).searchParams
    expect(withoutBrand.has('brand')).toBe(false)
  })

  // The drilldown must land on the same set of assets the report row counted, so every
  // profitability filter the departed search understands has to travel with the link.
  it('carries the customer and salesperson as ids, and omits them when unset', () => {
    const withBoth = parse(
      departedDrilldownHref({ ...NOTHING_SELECTED, customer: ACME, salesperson: DANA }),
    ).searchParams
    expect(withBoth.get('customer')).toBe('12')
    expect(withBoth.get('sp')).toBe('21')

    const withNeither = parse(departedDrilldownHref(NOTHING_SELECTED)).searchParams
    expect(withNeither.has('customer')).toBe(false)
    expect(withNeither.has('sp')).toBe(false)
  })
})
