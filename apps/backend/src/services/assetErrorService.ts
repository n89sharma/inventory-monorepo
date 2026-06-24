import { UpdateAssetErrors, UpdateError } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { validateErrorBrands } from '../lib/asset-error-validation.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

/**
 * Diff the asset's current AssetError rows against the desired `next` set, then
 * delete/create/update accordingly. Caller is responsible for having already
 * verified the error ids via validateErrorIdsForBrand. Returns the sorted
 * id lists for history recording.
 */
export async function reconcileAssetErrors(
  tx: Prisma.TransactionClient,
  assetId: number,
  next: UpdateError[],
  userId: number,
  now: Date = new Date(),
): Promise<{ prevErrorIds: number[]; nextErrorIds: number[] }> {
  const currentRows = await tx.assetError.findMany({
    where: { asset_id: assetId },
    select: { error_id: true, is_fixed: true },
  })
  const currentIdMap = new Map(currentRows.map((ae) => [ae.error_id, ae.is_fixed]))
  const inputIdMap = new Map(next.map((e) => [e.error_id, e.is_fixed]))

  const errorIdsToDelete = currentRows
    .filter((ae) => !inputIdMap.has(ae.error_id))
    .map((ae) => ae.error_id)
  if (errorIdsToDelete.length > 0) {
    await tx.assetError.deleteMany({
      where: { asset_id: assetId, error_id: { in: errorIdsToDelete } },
    })
  }

  const rowsToCreate = [...inputIdMap.entries()]
    .filter(([errorId]) => !currentIdMap.has(errorId))
    .map(([errorId, is_fixed]) => ({
      asset_id: assetId,
      error_id: errorId,
      is_fixed,
      added_by: userId,
      added_at: now,
      fixed_at: is_fixed ? now : null,
      fixed_by: is_fixed ? userId : null,
    }))
  if (rowsToCreate.length > 0) {
    await tx.assetError.createMany({ data: rowsToCreate })
  }

  for (const [errorId, is_fixed] of inputIdMap.entries()) {
    if (currentIdMap.has(errorId) && currentIdMap.get(errorId) !== is_fixed) {
      await tx.assetError.update({
        where: { asset_id_error_id: { asset_id: assetId, error_id: errorId } },
        data: {
          is_fixed,
          fixed_at: is_fixed ? now : null,
          fixed_by: is_fixed ? userId : null,
        },
      })
    }
  }

  return {
    prevErrorIds: currentRows.map((r) => r.error_id).sort(),
    nextErrorIds: [...inputIdMap.keys()].sort(),
  }
}

export async function updateAssetErrors(
  barcode: string,
  data: UpdateAssetErrors,
  userId: number,
): Promise<void> {
  const { assetId, prevErrorIds, nextErrorIds } = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { barcode },
      select: { id: true, model: { select: { brand_id: true } } },
    })
    if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

    await validateErrorBrands(
      tx,
      data.errors.map((e) => ({ errorId: e.error_id, expectedBrandId: asset.model.brand_id })),
    )
    const { prevErrorIds, nextErrorIds } = await reconcileAssetErrors(
      tx,
      asset.id,
      data.errors,
      userId,
    )
    return { assetId: asset.id, prevErrorIds, nextErrorIds }
  })

  await recordAssetUpdate(assetId, { error_ids: prevErrorIds }, { error_ids: nextErrorIds }, userId)
}
