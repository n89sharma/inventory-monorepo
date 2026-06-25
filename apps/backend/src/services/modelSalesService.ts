import { subMonths } from 'date-fns'
import { ASSET_STATUS, type ModelSaleRow, type ModelSalesResult } from 'shared-types'
import {
  getModelLastSale as getModelLastSaleQuery,
  getModelSales as getModelSalesQuery,
} from '../../generated/prisma/sql.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const SALES_WINDOW_MONTHS = 12

function mapModelSaleRow(row: getModelSalesQuery.Result): ModelSaleRow {
  return {
    barcode: row.barcode,
    departed_at: row.departed_at,
    purchase_price: row.purchase_cost ?? null,
    sale_price: row.sale_price ?? 0,
    meter: row.meter,
    customer: row.customer,
    salesperson: row.salesperson ?? null,
    cassettes: row.cassettes,
    internal_finisher: row.internal_finisher ?? null,
    core_functions: row.core_functions ?? [],
  }
}

export async function getModelSales(modelId: number): Promise<ModelSalesResult> {
  const fromDate = subMonths(new Date(), SALES_WINDOW_MONTHS)
  const soldStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.SOLD },
    select: { id: true },
  })
  const [model, sales, lastSaleRows, in_stock_count] = await Promise.all([
    prisma.model.findUnique({ where: { id: modelId }, select: { id: true } }),
    prisma.$queryRawTyped(getModelSalesQuery(modelId, fromDate, soldStatus.id)),
    prisma.$queryRawTyped(getModelLastSaleQuery(modelId, soldStatus.id)),
    prisma.asset.count({
      where: { model_id: modelId, Status: { status: ASSET_STATUS.IN_STOCK } },
    }),
  ])
  if (!model) throw new NotFoundError(`Model ${modelId} not found`)
  const lastSale = lastSaleRows[0]
  return {
    sales: sales.map(mapModelSaleRow),
    last_sale: lastSale ? mapModelSaleRow(lastSale) : null,
    in_stock_count,
  }
}
