import { getHoldsBySalesperson as getHoldsBySalespersonQuery } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { HELD_STATUS } from './assetReadService.js'

export async function getHoldsBySalespersonReport() {
  const statuses = await prisma.status.findMany({
    where: { status: HELD_STATUS },
    select: { id: true },
  })
  return prisma.$queryRawTyped(getHoldsBySalespersonQuery(statuses.map(s => s.id)))
}
