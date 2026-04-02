import { format } from 'date-fns'
import { prisma } from '../prisma.js'

export async function getNextSequence(entityType: string, warehouseCode: string, date: Date): Promise<number> {
  const formattedDate = format(date, 'yyyy-MM-dd')
  const result = await prisma.$queryRaw<[{ get_next_sequence: number }]>`SELECT get_next_sequence(${entityType}, ${warehouseCode}, ${formattedDate})`
  return result[0].get_next_sequence
}
