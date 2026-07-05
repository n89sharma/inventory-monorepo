import { UpdateAssetErrors, UpdateError } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { validateErrorBrands } from '../lib/asset-error-validation.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

// Readiness follows the asset's errors: any open (unfixed) error forces HAS_ERRORS,
// which is locked and never set by hand. Clearing the last open error releases the
// asset from HAS_ERRORS to PP_OK; a readiness the user set manually (UNTESTED / PP_OK
// / CUSTOMER_READY) is left untouched when no open error is involved.
const HAS_ERRORS_READINESS = 'HAS_ERRORS'
const PP_OK_READINESS = 'PP_OK'

/**
 * Diff the asset's current AssetError rows against the desired `newErrors` set,
 * then delete/create/update accordingly. Caller is responsible for having already
 * verified the error ids via validateErrorIdsForBrand. Returns the sorted
 * id lists for history recording.
 */
export async function reconcileAssetErrors(
  tx: Prisma.TransactionClient,
  assetId: number,
  newErrors: UpdateError[],
  userId: number,
  now: Date = new Date(),
): Promise<{ prevErrorIds: number[]; newErrorIds: number[] }> {
  const currentRows = await tx.assetError.findMany({
    where: { asset_id: assetId },
    select: { error_id: true, is_fixed: true },
  })
  const currentIdMap = new Map(currentRows.map((ae) => [ae.error_id, ae.is_fixed]))
  const inputIdMap = new Map(newErrors.map((e) => [e.error_id, e.is_fixed]))

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
    newErrorIds: [...inputIdMap.keys()].sort(),
  }
}

export async function updateAssetErrors(
  barcode: string,
  data: UpdateAssetErrors,
  userId: number,
): Promise<void> {
  const hasOpenError = data.errors.some((e) => !e.is_fixed)
  const readinessIdByStatus = await resolveReadinessIds([HAS_ERRORS_READINESS, PP_OK_READINESS])
  const hasErrorsReadinessId = readinessIdByStatus.get(HAS_ERRORS_READINESS)!
  const ppOkReadinessId = readinessIdByStatus.get(PP_OK_READINESS)!

  const { assetId, prevErrorIds, newErrorIds, prevReadinessId, newReadinessId } =
    await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({
        where: { barcode },
        select: { id: true, readiness_id: true, model: { select: { brand_id: true } } },
      })
      if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

      await validateErrorBrands(
        tx,
        data.errors.map((e) => ({ errorId: e.error_id, expectedBrandId: asset.model.brand_id })),
      )
      const { prevErrorIds, newErrorIds } = await reconcileAssetErrors(
        tx,
        asset.id,
        data.errors,
        userId,
      )

      // Readiness only moves in two cases: an open error forces HAS_ERRORS, or
      // clearing the last open error releases HAS_ERRORS to PP_OK. A null means no
      // change — any other manually-set readiness is left as-is.
      let newReadinessId: number | null = null
      if (hasOpenError) {
        newReadinessId = hasErrorsReadinessId
      } else if (asset.readiness_id === hasErrorsReadinessId) {
        newReadinessId = ppOkReadinessId
      }

      if (newReadinessId !== null) {
        await tx.asset.update({ where: { id: asset.id }, data: { readiness_id: newReadinessId } })
      }

      return {
        assetId: asset.id,
        prevErrorIds,
        newErrorIds,
        prevReadinessId: asset.readiness_id,
        newReadinessId,
      }
    })

  await recordAssetUpdate(
    assetId,
    { error_ids: prevErrorIds, readiness_id: prevReadinessId },
    { error_ids: newErrorIds, readiness_id: newReadinessId ?? prevReadinessId },
    userId,
  )
}

/**
 * Resolve a set of readiness status codes to their ids. Readiness rows are
 * immutable reference data, so this runs outside the caller's transaction.
 */
async function resolveReadinessIds(statuses: string[]): Promise<Map<string, number>> {
  const rows = await prisma.readiness.findMany({
    where: { status: { in: statuses } },
    select: { id: true, status: true },
  })
  const idByStatus = new Map(rows.map((r) => [r.status, r.id]))
  for (const status of statuses) {
    if (!idByStatus.has(status)) throw new NotFoundError(`Readiness ${status} not configured`)
  }
  return idByStatus
}
