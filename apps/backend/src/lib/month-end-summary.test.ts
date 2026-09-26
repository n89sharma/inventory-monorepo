import { describe, expect, it } from 'vitest'
import { Prisma } from '../../generated/prisma/client.js'
import {
  buildMonthEndSummary,
  type MonthEndSummaryAsset,
  type MonthEndSummaryPart,
} from './month-end-summary.js'

const YYZ = { warehouse_id: 1, city_code: 'YYZ' }
const DFW = { warehouse_id: 2, city_code: 'DFW' }

function decimal(value: number | null): Prisma.Decimal | null {
  return value === null ? null : new Prisma.Decimal(value)
}

function onHand(
  warehouse: typeof YYZ,
  base: number | null,
  freight: number | null,
  total: number | null,
): MonthEndSummaryAsset {
  return {
    ...warehouse,
    is_in_transit: false,
    purchase_cost: decimal(base),
    transport_cost: decimal(freight),
    total_cost: decimal(total),
  }
}

function inTransit(warehouse: typeof YYZ, base: number, freight: number, total: number) {
  return { ...onHand(warehouse, base, freight, total), is_in_transit: true }
}

function parts(warehouse: typeof YYZ, value: number): MonthEndSummaryPart {
  return { ...warehouse, stock_value: new Prisma.Decimal(value) }
}

describe('buildMonthEndSummary', () => {
  it('splits a warehouse into on-hand and in-transit rows and sums base plus freight', () => {
    const summary = buildMonthEndSummary(
      [onHand(YYZ, 100, 10, 150), onHand(YYZ, 200, 20, 260), inTransit(YYZ, 50, 5, 70)],
      [],
      true,
    )

    const [yyz] = summary.warehouses
    expect(yyz.on_hand).toEqual({ base: 300, freight: 30, base_freight: 330, total: 410 })
    expect(yyz.in_transit).toEqual({ base: 50, freight: 5, base_freight: 55, total: 70 })
  })

  it('adds parts to the Total column only', () => {
    const summary = buildMonthEndSummary([onHand(YYZ, 100, 10, 150)], [parts(YYZ, 40)], true)

    const [yyz] = summary.warehouses
    expect(yyz.parts_value).toBe(40)
    expect(yyz.total).toEqual({ base: 100, freight: 10, base_freight: 110, total: 190 })
  })

  it('leaves parts out when a brand filter applies', () => {
    const summary = buildMonthEndSummary([onHand(YYZ, 100, 10, 150)], [parts(YYZ, 40)], false)

    expect(summary.warehouses[0].parts_value).toBeNull()
    expect(summary.company.total.total).toBe(150)
  })

  it('counts a missing cost as zero', () => {
    const summary = buildMonthEndSummary([onHand(YYZ, null, null, null)], [], true)

    expect(summary.warehouses[0].on_hand).toEqual({
      base: 0,
      freight: 0,
      base_freight: 0,
      total: 0,
    })
  })

  it('lists warehouses by total cost, highest first, including a parts-only warehouse', () => {
    const summary = buildMonthEndSummary([onHand(YYZ, 100, 10, 150)], [parts(DFW, 25)], true)

    expect(summary.warehouses.map((warehouse) => warehouse.city_code)).toEqual(['YYZ', 'DFW'])
  })

  it('totals every warehouse into the company table', () => {
    const summary = buildMonthEndSummary(
      [onHand(YYZ, 100, 10, 150), onHand(DFW, 200, 20, 250), inTransit(DFW, 30, 3, 40)],
      [parts(YYZ, 5), parts(DFW, 15)],
      true,
    )

    expect(summary.company.on_hand).toEqual({
      base: 300,
      freight: 30,
      base_freight: 330,
      total: 400,
    })
    expect(summary.company.in_transit).toEqual({
      base: 30,
      freight: 3,
      base_freight: 33,
      total: 40,
    })
    expect(summary.company.parts_value).toBe(20)
    expect(summary.company.total.total).toBe(460)
  })
})
