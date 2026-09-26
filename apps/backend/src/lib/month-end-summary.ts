import type { MonthEndCostRow, MonthEndSummary, MonthEndSummaryTable } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'

const ZERO = new Prisma.Decimal(0)

export interface MonthEndSummaryAsset {
  warehouse_id: number
  city_code: string
  is_in_transit: boolean
  purchase_cost: Prisma.Decimal | null
  transport_cost: Prisma.Decimal | null
  total_cost: Prisma.Decimal | null
}

export interface MonthEndSummaryPart {
  warehouse_id: number
  city_code: string
  stock_value: Prisma.Decimal
}

interface CostTotals {
  base: Prisma.Decimal
  freight: Prisma.Decimal
  total: Prisma.Decimal
}

interface TableTotals {
  onHand: CostTotals
  inTransit: CostTotals
  parts: Prisma.Decimal
}

function emptyCostTotals(): CostTotals {
  return { base: ZERO, freight: ZERO, total: ZERO }
}

function emptyTableTotals(): TableTotals {
  return { onHand: emptyCostTotals(), inTransit: emptyCostTotals(), parts: ZERO }
}

function addCosts(a: CostTotals, b: CostTotals): CostTotals {
  return {
    base: a.base.add(b.base),
    freight: a.freight.add(b.freight),
    total: a.total.add(b.total),
  }
}

function addAsset(totals: CostTotals, asset: MonthEndSummaryAsset): CostTotals {
  return addCosts(totals, {
    base: asset.purchase_cost ?? ZERO,
    freight: asset.transport_cost ?? ZERO,
    total: asset.total_cost ?? ZERO,
  })
}

function toCostRow(totals: CostTotals): MonthEndCostRow {
  return {
    base: totals.base.toNumber(),
    freight: totals.freight.toNumber(),
    base_freight: totals.base.add(totals.freight).toNumber(),
    total: totals.total.toNumber(),
  }
}

function toSummaryTable(totals: TableTotals, includeParts: boolean): MonthEndSummaryTable {
  const assetTotals = addCosts(totals.onHand, totals.inTransit)
  const grandTotal = { ...assetTotals, total: assetTotals.total.add(totals.parts) }
  return {
    on_hand: toCostRow(totals.onHand),
    in_transit: toCostRow(totals.inTransit),
    parts_value: includeParts ? totals.parts.toNumber() : null,
    total: toCostRow(grandTotal),
  }
}

export function buildMonthEndSummary(
  assets: MonthEndSummaryAsset[],
  parts: MonthEndSummaryPart[],
  includeParts: boolean,
): MonthEndSummary {
  const byWarehouse = new Map<number, { city_code: string; totals: TableTotals }>()
  const warehouseEntry = (warehouseId: number, cityCode: string) => {
    const existing = byWarehouse.get(warehouseId)
    if (existing) return existing
    const created = { city_code: cityCode, totals: emptyTableTotals() }
    byWarehouse.set(warehouseId, created)
    return created
  }

  const company = emptyTableTotals()
  for (const asset of assets) {
    const { totals } = warehouseEntry(asset.warehouse_id, asset.city_code)
    if (asset.is_in_transit) {
      totals.inTransit = addAsset(totals.inTransit, asset)
      company.inTransit = addAsset(company.inTransit, asset)
    } else {
      totals.onHand = addAsset(totals.onHand, asset)
      company.onHand = addAsset(company.onHand, asset)
    }
  }

  if (includeParts) {
    for (const part of parts) {
      const { totals } = warehouseEntry(part.warehouse_id, part.city_code)
      totals.parts = totals.parts.add(part.stock_value)
      company.parts = company.parts.add(part.stock_value)
    }
  }

  const warehouses = [...byWarehouse]
    .map(([warehouseId, entry]) => ({
      warehouse_id: warehouseId,
      city_code: entry.city_code,
      ...toSummaryTable(entry.totals, includeParts),
    }))
    .sort((a, b) => b.total.total - a.total.total)

  return { warehouses, company: toSummaryTable(company, includeParts) }
}
