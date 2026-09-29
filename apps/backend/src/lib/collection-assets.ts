import { ASSET_STATUS, ON_HAND_STATUS_VALUES, TRANSFER_STATUS } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { ConflictError } from './errors.js'
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
  if (inCollection.length > 0) throw assetInCollectionError(inCollection.map((a) => a.barcode))
}

const MISSING_ASSET_WHERE = {
  status: { status: ASSET_STATUS.MISSING },
} satisfies Prisma.AssetWhereInput

const MISSING_ASSETS_MESSAGE = 'Missing assets cannot be added to a collection:'

export async function assertAssetsNotMissing(
  tx: Prisma.TransactionClient,
  assetIds: number[],
): Promise<void> {
  await assertAssetsNotInCollection(
    tx,
    assetIds,
    MISSING_ASSET_WHERE,
    (barcodes) => new ConflictError(`${MISSING_ASSETS_MESSAGE} ${barcodes.join(', ')}`),
  )
}

const ON_DEPARTURE_WHERE = { departure_id: { not: null } } satisfies Prisma.AssetWhereInput

const ON_DEPARTURE_MESSAGE = 'Assets already assigned to a departure:'

export async function assertAssetsNotOnDeparture(
  tx: Prisma.TransactionClient,
  assetIds: number[],
): Promise<void> {
  await assertAssetsNotInCollection(
    tx,
    assetIds,
    ON_DEPARTURE_WHERE,
    (barcodes) => new ConflictError(`${ON_DEPARTURE_MESSAGE} ${barcodes.join(', ')}`),
  )
}

export async function assertAssetsNotOnOpenTransfer(
  tx: Prisma.TransactionClient,
  assetIds: number[],
  excludeTransferId?: number,
): Promise<void> {
  if (assetIds.length === 0) return
  const conflicts = await tx.assetTransfer.findMany({
    where: {
      asset_id: { in: assetIds },
      transfer: {
        status: { not: TRANSFER_STATUS.COMPLETE },
        ...(excludeTransferId !== undefined ? { id: { not: excludeTransferId } } : {}),
      },
    },
    select: {
      asset: { select: { barcode: true } },
      transfer: { select: { transfer_number: true } },
    },
  })
  if (conflicts.length > 0) {
    const detail = conflicts
      .map((c) => `${c.asset.barcode} (on ${c.transfer.transfer_number})`)
      .join(', ')
    throw new ConflictError(`Already on an open transfer: ${detail}`)
  }
}

const ON_HAND_STATUSES: readonly string[] = ON_HAND_STATUS_VALUES

export async function assertAssetsOnHand(
  tx: Prisma.TransactionClient,
  assetIds: number[],
  notOnHandError: (detail: string) => Error,
): Promise<void> {
  if (assetIds.length === 0) return
  const assets = await tx.asset.findMany({
    where: { id: { in: assetIds } },
    select: { barcode: true, status: { select: { status: true } } },
  })
  const notOnHand = assets.filter((asset) => !ON_HAND_STATUSES.includes(asset.status.status))
  if (notOnHand.length > 0) {
    const detail = notOnHand.map((asset) => `${asset.barcode} (${asset.status.status})`).join(', ')
    throw notOnHandError(detail)
  }
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
