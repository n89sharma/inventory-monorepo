import type { HeldReportRow } from 'shared-types'

type CustomerHoldsGroup = {
  customerId: number
  customerName: string
  assetCount: number
  holdCount: number
  maxHeldDays: number
}

export type SalespersonHoldsGroup = {
  salesRepId: number
  salesRepName: string
  assetCount: number
  holdCount: number
  maxHeldDays: number
  customers: CustomerHoldsGroup[]
}

type HeldReportTotals = {
  assetCount: number
  holdCount: number
  salespersonCount: number
  maxHeldDays: number
}

export type HeldReportSummary = {
  totals: HeldReportTotals
  salespeople: SalespersonHoldsGroup[]
}

function maximum(values: number[]): number {
  if (values.length === 0) return 0
  return Math.max(...values)
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

export function aggregateHeldReport(rows: HeldReportRow[]): HeldReportSummary {
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
      maxHeldDays: maximum(rep.daysHeld),
      customers: Array.from(rep.customers.values())
        .map((customer) => ({
          customerId: customer.customerId,
          customerName: customer.customerName,
          assetCount: customer.assetCount,
          holdCount: customer.daysHeld.length,
          maxHeldDays: maximum(customer.daysHeld),
        }))
        .sort(byHoldCountDesc),
    }))
    .sort(byHoldCountDesc)

  return {
    totals: {
      assetCount: totalAssetCount,
      holdCount: rows.length,
      salespersonCount: reps.size,
      maxHeldDays: maximum(rows.map((row) => row.days_held)),
    },
    salespeople,
  }
}
