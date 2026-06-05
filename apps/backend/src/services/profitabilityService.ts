import { getProfitabilityCube as getProfitabilityCubeQuery } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getProfitabilityCube(year: number) {
  return prisma.$queryRawTyped(getProfitabilityCubeQuery(year))
}
