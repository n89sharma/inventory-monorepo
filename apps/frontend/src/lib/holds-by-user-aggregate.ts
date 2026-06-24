import type { ActiveHoldRow } from 'shared-types'

export type CustomerHoldsGroup = {
  customerId: number
  customerName: string
  assetCount: number
  holdCount: number
  medianHeldDays: number
}

export type SalespersonHoldsGroup = {
  salesRepId: number
  salesRepName: string
  assetCount: number
  holdCount: number
  medianHeldDays: number
  customers: CustomerHoldsGroup[]
}

export type HoldsTotals = {
  assetCount: number
  holdCount: number
  salespersonCount: number
  medianHeldDays: number
}

export type HoldsByUserTable = {
  totals: HoldsTotals
  salespeople: SalespersonHoldsGroup[]
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function byHoldCountDesc(a: { holdCount: number }, b: { holdCount: number }): number {
  return b.holdCount - a.holdCount
}

type CustomerAccumulator = {
  customerId: number
  customerName: string
  assetCount: number
  daysHeld: number[]
}

type RepAccumulator = {
  salesRepId: number
  salesRepName: string
  assetCount: number
  daysHeld: number[]
  customers: Map<number, CustomerAccumulator>
}

export function aggregateHolds(rows: ActiveHoldRow[]): HoldsByUserTable {
  const reps = new Map<number, RepAccumulator>()
  let totalAssetCount = 0

  for (const row of rows) {
    totalAssetCount += row.held_asset_count

    let rep = reps.get(row.sales_rep_id)
    if (!rep) {
      rep = {
        salesRepId: row.sales_rep_id,
        salesRepName: row.sales_rep_name,
        assetCount: 0,
        daysHeld: [],
        customers: new Map(),
      }
      reps.set(row.sales_rep_id, rep)
    }
    rep.assetCount += row.held_asset_count
    rep.daysHeld.push(row.days_held)

    let customer = rep.customers.get(row.customer_id)
    if (!customer) {
      customer = {
        customerId: row.customer_id,
        customerName: row.customer_name,
        assetCount: 0,
        daysHeld: [],
      }
      rep.customers.set(row.customer_id, customer)
    }
    customer.assetCount += row.held_asset_count
    customer.daysHeld.push(row.days_held)
  }

  const salespeople: SalespersonHoldsGroup[] = Array.from(reps.values())
    .map((rep) => ({
      salesRepId: rep.salesRepId,
      salesRepName: rep.salesRepName,
      assetCount: rep.assetCount,
      holdCount: rep.daysHeld.length,
      medianHeldDays: median(rep.daysHeld),
      customers: Array.from(rep.customers.values())
        .map((customer) => ({
          customerId: customer.customerId,
          customerName: customer.customerName,
          assetCount: customer.assetCount,
          holdCount: customer.daysHeld.length,
          medianHeldDays: median(customer.daysHeld),
        }))
        .sort(byHoldCountDesc),
    }))
    .sort(byHoldCountDesc)

  return {
    totals: {
      assetCount: totalAssetCount,
      holdCount: rows.length,
      salespersonCount: reps.size,
      medianHeldDays: median(rows.map((row) => row.days_held)),
    },
    salespeople,
  }
}
