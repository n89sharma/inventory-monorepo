import { Prisma } from '../../generated/prisma/client.js'
import { COST_COMPONENT_FIELDS, type CostComponentField } from 'shared-types'

const ZERO = new Prisma.Decimal(0)

export function decimalToNumber(d: Prisma.Decimal | null): number | null {
  return d === null ? null : d.toNumber()
}

export function totalCostDecimal(
  components: Partial<Record<CostComponentField, Prisma.Decimal | null>>,
): Prisma.Decimal {
  return COST_COMPONENT_FIELDS.reduce((total, field) => total.add(components[field] ?? ZERO), ZERO)
}
