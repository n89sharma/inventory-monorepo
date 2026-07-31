import { getHeldReport as getHeldReportQuery } from '../../generated/prisma/sql.js'
import { ASSET_STATUS } from 'shared-types'
import { prisma } from '../prisma.js'

export async function getHeldReport() {
  const statuses = await prisma.status.findMany({
    where: { status: ASSET_STATUS.HELD },
    select: { id: true },
  })
  return prisma.$queryRawTyped(getHeldReportQuery(statuses.map((s) => s.id)))
}
