import { prisma } from '../prisma.js'

const SEQ_NAMES: Record<string, string> = {
  asset: 'seq_asset',
  arrival: 'seq_arrival',
  departure: 'seq_departure',
  transfer: 'seq_transfer',
  hold: 'seq_hold',
  invoice: 'seq_invoice',
  store_transaction: 'seq_store_transaction',
}

export async function getNextSequence(entityType: string): Promise<number> {
  const seqName = SEQ_NAMES[entityType.toLowerCase()]
  if (!seqName) throw new Error(`Unknown sequence entity type: ${entityType}`)
  const result = await prisma.$queryRaw<[{ nextval: bigint }]>`
    SELECT nextval(${`public.${seqName}`}::regclass)
  `
  return Number(result[0].nextval)
}
