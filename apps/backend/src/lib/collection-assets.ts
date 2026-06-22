import type { Prisma } from '../../generated/prisma/client.js'
import {
  recordAssetUpdateOnCollection,
  recordCollectionUpdateOnAssets,
} from '../services/historyService.js'

type CollectionEntity = 'Arrival' | 'Departure' | 'Invoice' | 'Hold'
type CollectionForeignKey =
  | 'arrival_id'
  | 'departure_id'
  | 'purchase_invoice_id'
  | 'sales_invoice_id'
  | 'hold_id'

export async function assertAssetsNotInCollection(
  tx: Prisma.TransactionClient,
  assetIds: number[],
  assetInCollectionWhere: Prisma.AssetWhereInput,
  assetInCollectionError: (barcodes: string[]) => Error,
): Promise<void> {
  if (assetIds.length === 0) return
  const inCollection = await tx.asset.findMany({
    where: { id: { in: assetIds }, ...assetInCollectionWhere },
    select: { barcode: true },
  })
  if (inCollection.length > 0) throw assetInCollectionError(inCollection.map(a => a.barcode))
}

export type AssetCollectionTransaction = {
  assetsToAdd: number[]
  assetsToRemove: number[]
  assetInCollectionWhere: Prisma.AssetWhereInput
  assetInCollectionError: (barcodes: string[]) => Error
  add: Prisma.AssetUncheckedUpdateManyInput
  remove: Prisma.AssetUncheckedUpdateManyInput
}

// Generic membership delta over the shared Asset type: check then remove then add.
// The add/remove data clauses may set the FK alone (arrival/departure/invoice) or
// the FK plus status_id (hold) — the recipe is the same either way.
export async function addRemoveCollectionFromAssets(
  tx: Prisma.TransactionClient,
  transaction: AssetCollectionTransaction,
): Promise<void> {
  await assertAssetsNotInCollection(
    tx,
    transaction.assetsToAdd,
    transaction.assetInCollectionWhere,
    transaction.assetInCollectionError,
  )
  if (transaction.assetsToRemove.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: transaction.assetsToRemove } },
      data: transaction.remove,
    })
  }
  if (transaction.assetsToAdd.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: transaction.assetsToAdd } },
      data: transaction.add,
    })
  }
}

// History tail — runs after the transaction (best-effort audit, never inside tx).
export async function recordCollectionAssetDelta(
  entity: CollectionEntity,
  field: CollectionForeignKey,
  entityId: number,
  assetsToAdd: number[],
  assetsToRemove: number[],
  userId: number,
): Promise<void> {
  await recordCollectionUpdateOnAssets(assetsToRemove, assetsToAdd, field, entityId, userId)
  await recordAssetUpdateOnCollection(entity, entityId, assetsToAdd, assetsToRemove, userId)
}
