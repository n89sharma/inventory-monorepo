import { getInStockSummary as getInStockSummaryQuery } from '../../generated/prisma/sql.js'
import { ASSET_STATUS, type Permission } from 'shared-types'
import { prisma } from '../prisma.js'

const VIEW_COST_PERMISSION = 'view_purchase_price'

export async function getInStockSummaryReport(permissions: ReadonlySet<Permission>) {
  const statuses = await prisma.status.findMany({
    where: { status: ASSET_STATUS.IN_STOCK },
    select: { id: true },
  })
  const rows = await prisma.$queryRawTyped(getInStockSummaryQuery(statuses.map((s) => s.id)))
  if (permissions.has(VIEW_COST_PERMISSION)) return rows
  return rows.map((row) => ({ ...row, purchase_cost_sum: null, total_cost_sum: null }))
}
