import {
  getStockSalesSalePrices as getStockSalesSalePricesQuery,
  getStockSales as getStockSalesQuery,
} from '../../generated/prisma/sql.js'
import { ASSET_STATUS, ON_HAND_STATUS_VALUES, type Permission } from 'shared-types'
import { prisma } from '../prisma.js'

const VIEW_COST_PERMISSION = 'view_purchase_price'
const VIEW_SALE_PERMISSION = 'view_sale_price'

async function getStock(permissions: ReadonlySet<Permission>) {
  const statuses = await prisma.status.findMany({
    where: { status: { in: [...ON_HAND_STATUS_VALUES] } },
    select: { id: true, status: true },
  })
  const idsOf = (status: string) => statuses.filter((s) => s.status === status).map((s) => s.id)
  const rows = await prisma.$queryRawTyped(
    getStockSalesQuery(idsOf(ASSET_STATUS.IN_STOCK), idsOf(ASSET_STATUS.HELD)),
  )
  if (permissions.has(VIEW_COST_PERMISSION)) return rows
  return rows.map((row) => ({ ...row, purchase_cost_sum: null, total_cost_sum: null }))
}

async function getSalePrices(salesFrom: string, permissions: ReadonlySet<Permission>) {
  if (!permissions.has(VIEW_SALE_PERMISSION)) return null
  const soldStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.SOLD },
    select: { id: true },
  })
  const rows = await prisma.$queryRawTyped(getStockSalesSalePricesQuery(soldStatus.id, salesFrom))
  return rows.map((row) => ({ ...row, sale_prices: row.sale_prices ?? [] }))
}

export async function getStockSalesReport(salesFrom: string, permissions: ReadonlySet<Permission>) {
  const [stock, sale_prices] = await Promise.all([
    getStock(permissions),
    getSalePrices(salesFrom, permissions),
  ])
  return { stock, sale_prices }
}
