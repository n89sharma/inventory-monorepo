import { getInStockSummary as getInStockSummaryQuery } from '../../generated/prisma/sql.js'
import { ASSET_STATUS } from 'shared-types'
import { prisma } from '../prisma.js'

export async function getInStockSummaryReport() {
  const statuses = await prisma.status.findMany({
    where: { status: ASSET_STATUS.IN_STOCK },
    select: { id: true },
  })
  return prisma.$queryRawTyped(getInStockSummaryQuery(statuses.map((s) => s.id)))
}
