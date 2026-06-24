import type { Prisma } from '../../generated/prisma/client.js'
import { ValidationError } from './errors.js'

/**
 * Each pair declares that `componentId` is expected to belong to `expectedBrandId`.
 * The validator fetches every unique `componentId` once, then checks that:
 *   1. every referenced id exists in the Component table; and
 *   2. each pair's id is in fact tied to the brand the caller expects.
 *
 * Throws `ValidationError` on the first failure of either rule. Returns
 * silently when the input list is empty. Mirrors `validateErrorBrands` —
 * Component is brand-scoped reference data, so an asset may only reference a
 * component belonging to its model's brand.
 */
export async function validateComponentBrands(
  tx: Prisma.TransactionClient,
  pairs: Array<{ componentId: number; expectedBrandId: number }>,
): Promise<void> {
  if (pairs.length === 0) return

  const uniqueIds = [...new Set(pairs.map((p) => p.componentId))]
  const found = await tx.component.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, brand_id: true },
  })

  if (found.length !== uniqueIds.length) {
    const foundSet = new Set(found.map((f) => f.id))
    const missing = uniqueIds.filter((id) => !foundSet.has(id))
    throw new ValidationError(`Unknown component id(s): ${missing.join(', ')}`)
  }

  const brandByComponentId = new Map(found.map((f) => [f.id, f.brand_id]))
  const mismatched = pairs
    .filter((p) => brandByComponentId.get(p.componentId) !== p.expectedBrandId)
    .map(
      (p) =>
        `${p.componentId} (expected brand ${p.expectedBrandId}, got ${brandByComponentId.get(p.componentId)})`,
    )
  if (mismatched.length > 0) {
    throw new ValidationError(
      `Component id(s) belong to a different brand: ${mismatched.join(', ')}`,
    )
  }
}
