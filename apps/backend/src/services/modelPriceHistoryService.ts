import { subMonths } from 'date-fns'
import { ASSET_STATUS, type ModelPriceHistoryResult, type ModelPriceHistoryRow } from 'shared-types'
import {
  getModelLastSale as getModelLastSaleQuery,
  getModelPriceHistory as getModelPriceHistoryQuery,
} from '../../generated/prisma/sql.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const SALES_WINDOW_MONTHS = 12

function mapModelPriceHistoryRow(row: getModelPriceHistoryQuery.Result): ModelPriceHistoryRow {
  return {
    barcode: row.barcode,
    arrived_at: row.arrived_at,
    departed_at: row.departed_at,
    purchase_price: row.purchase_cost ?? null,
    sale_price: row.sale_price ?? 0,
    meter: row.meter,
    vendor: row.vendor,
    customer: row.customer,
    salesperson: row.salesperson ?? null,
    cassettes: row.cassettes,
    internal_finisher: row.internal_finisher ?? null,
    core_functions: row.core_functions ?? [],
  }
}

export async function getModelPriceHistory(modelId: number): Promise<ModelPriceHistoryResult> {
  const fromDate = subMonths(new Date(), SALES_WINDOW_MONTHS)
  const soldStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.SOLD },
    select: { id: true },
  })
  const [model, sales, lastSaleRows, in_stock_count] = await Promise.all([
    prisma.model.findUnique({ where: { id: modelId }, select: { id: true } }),
    prisma.$queryRawTyped(getModelPriceHistoryQuery(modelId, fromDate, soldStatus.id)),
    prisma.$queryRawTyped(getModelLastSaleQuery(modelId, soldStatus.id)),
    prisma.asset.count({
      where: { model_id: modelId, status: { status: ASSET_STATUS.IN_STOCK } },
    }),
  ])
  if (!model) throw new NotFoundError(`Model ${modelId} not found`)
  const lastSale = lastSaleRows[0]
  return {
    sales: sales.map(mapModelPriceHistoryRow),
    last_sale: lastSale ? mapModelPriceHistoryRow(lastSale) : null,
    in_stock_count,
  }
}
