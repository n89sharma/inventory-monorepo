import type { Prisma } from '../../generated/prisma/client.js'

export function decimalToNumber(d: Prisma.Decimal | null): number | null {
  return d === null ? null : d.toNumber()
}
