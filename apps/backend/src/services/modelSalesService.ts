import { subMonths } from 'date-fns'
import type { ModelSaleRow, ModelSalesResult } from 'shared-types'
import {
  getModelLastSale as getModelLastSaleQuery,
  getModelSales as getModelSalesQuery,
} from '../../generated/prisma/sql.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

const IN_STOCK_STATUS = 'IN_STOCK'
const SOLD_STATUS = 'SOLD'
const SALES_WINDOW_MONTHS = 12

function mapModelSaleRow(row: getModelSalesQuery.Result): ModelSaleRow {
  return {
    barcode: row.barcode,
    departed_at: row.departed_at,
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
    where: { status: SOLD_STATUS },
    select: { id: true },
  })
  const [model, sales, lastSaleRows, in_stock_count] = await Promise.all([
    prisma.model.findUnique({ where: { id: modelId }, select: { id: true } }),
    prisma.$queryRawTyped(getModelSalesQuery(modelId, fromDate, soldStatus.id)),
    prisma.$queryRawTyped(getModelLastSaleQuery(modelId, soldStatus.id)),
    prisma.asset.count({
      where: { model_id: modelId, Status: { status: IN_STOCK_STATUS } },
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
