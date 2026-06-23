import { getHoldsByUser as getHoldsByUserQuery } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { HELD_STATUS } from './assetReadService.js'

export async function getHoldsByUserReport() {
  const statuses = await prisma.status.findMany({
    where: { status: HELD_STATUS },
    select: { id: true },
  })
  return prisma.$queryRawTyped(getHoldsByUserQuery(statuses.map(s => s.id)))
}
