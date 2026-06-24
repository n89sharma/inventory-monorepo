import type { Prisma } from '../../generated/prisma/client.js'
import { ValidationError } from './errors.js'

/**
 * Each pair declares that `errorId` is expected to belong to `expectedBrandId`.
 * The validator fetches every unique `errorId` once, then checks that:
 *   1. every referenced id exists in the Error table; and
 *   2. each pair's id is in fact tied to the brand the caller expects.
 *
 * Throws `ValidationError` on the first failure of either rule. Returns
 * silently when the input list is empty.
 *
 * Use the single-brand convenience builder for asset-scoped writes
 * (every id shares one brand). Use the pair list directly when the same
 * payload spans multiple brands — e.g. a batch arrival where each asset
 * carries its own model and therefore its own expected brand.
 */
export async function validateErrorBrands(
  tx: Prisma.TransactionClient,
  pairs: Array<{ errorId: number; expectedBrandId: number }>,
): Promise<void> {
  if (pairs.length === 0) return

  const uniqueIds = [...new Set(pairs.map((p) => p.errorId))]
  const found = await tx.error.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, brand_id: true },
  })

  if (found.length !== uniqueIds.length) {
    const foundSet = new Set(found.map((f) => f.id))
    const missing = uniqueIds.filter((id) => !foundSet.has(id))
    throw new ValidationError(`Unknown error id(s): ${missing.join(', ')}`)
  }

  const brandByErrorId = new Map(found.map((f) => [f.id, f.brand_id]))
  const mismatched = pairs
    .filter((p) => brandByErrorId.get(p.errorId) !== p.expectedBrandId)
    .map(
      (p) =>
        `${p.errorId} (expected brand ${p.expectedBrandId}, got ${brandByErrorId.get(p.errorId)})`,
    )
  if (mismatched.length > 0) {
    throw new ValidationError(`Error id(s) belong to a different brand: ${mismatched.join(', ')}`)
  }
}
