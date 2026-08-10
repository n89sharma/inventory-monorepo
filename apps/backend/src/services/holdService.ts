import {
  AssetDelta,
  ASSET_STATUS,
  type AppRole,
  CreateHold,
  HoldDetail,
  UpdateHoldMetadata,
} from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForHold } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { mapAssetSearchRow } from '../lib/asset-mappers.js'
import { redactSearchRowCost } from '../lib/cost-redaction.js'
import { mapUser } from '../lib/user-mappers.js'
import {
  recordAssetStatusChange,
  recordAssetUpdateOnCollection,
  recordCollectionMoveOnAssets,
  recordHoldArchive,
  recordHoldCreate,
  recordHoldUpdate,
} from './historyService.js'
import {
  addRemoveCollectionFromAssets,
  recordCollectionAssetDelta,
} from '../lib/collection-assets.js'
import { prisma } from '../prisma.js'

export async function createHold(data: CreateHold, userId: number): Promise<string> {
  const assetIds = data.assets.map((a) => a.id)

  const heldStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.HELD },
    select: { id: true },
  })

  const now = new Date()
  const holdNumber = await getNewHoldNumber()

  const { hold, priorAssets } = await prisma.$transaction(async (tx) => {
    const created = await tx.hold.create({
      data: {
        hold_number: holdNumber,
        created_by: { connect: { id: userId } },
        created_for: { connect: { id: data.created_for_id } },
        customer: { connect: { id: data.customer_id } },
        notes: data.notes ?? null,
        created_at: now,
        from_dt: now,
        to_dt: null,
      },
      select: { id: true },
    })

    const prior = await tx.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, status_id: true },
    })

    await addRemoveCollectionFromAssets(tx, {
      assetsToAdd: assetIds,
      assetsToRemove: [],
      assetInCollectionWhere: { hold_id: { not: null } },
      assetInCollectionError: (barcodes) =>
        new ConflictError(
          `The following assets already have an active hold: ${barcodes.join(', ')}`,
        ),
      add: { hold_id: created.id, status_id: heldStatus.id },
      remove: { hold_id: null },
    })

    return { hold: created, priorAssets: prior }
  })

  await recordHoldCreate(
    hold.id,
    {
      hold_number: holdNumber,
      created_for_id: data.created_for_id,
      customer_id: data.customer_id,
      created_at: now,
    },
    userId,
  )

  await recordCollectionAssetDelta('Hold', 'hold_id', hold.id, assetIds, [], userId)

  await recordAssetStatusChange(priorAssets, heldStatus.id, userId)

  return holdNumber
}

export type HoldRelease = {
  releasedAssetIdsByHold: Map<number, number[]>
  emptiedHoldIds: number[]
}

export async function archiveHoldsEmptiedByReleasedAssets(
  tx: Prisma.TransactionClient,
  releasedAssets: { id: number; hold_id: number | null }[],
  archivedAt: Date,
): Promise<HoldRelease> {
  const releasedAssetIdsByHold = new Map<number, number[]>()
  for (const asset of releasedAssets) {
    if (asset.hold_id === null) continue
    const assetIds = releasedAssetIdsByHold.get(asset.hold_id)
    if (assetIds) assetIds.push(asset.id)
    else releasedAssetIdsByHold.set(asset.hold_id, [asset.id])
  }

  const holdIds = [...releasedAssetIdsByHold.keys()]
  if (holdIds.length === 0) return { releasedAssetIdsByHold, emptiedHoldIds: [] }

  const occupied = await tx.asset.findMany({
    where: { hold_id: { in: holdIds } },
    select: { hold_id: true },
    distinct: ['hold_id'],
  })
  const occupiedHoldIds = new Set(occupied.map((a) => a.hold_id))
  const emptiedHoldIds = holdIds.filter((id) => !occupiedHoldIds.has(id))

  if (emptiedHoldIds.length > 0) {
    await tx.hold.updateMany({
      where: { id: { in: emptiedHoldIds }, archived_at: null },
      data: { archived_at: archivedAt },
    })
  }

  return { releasedAssetIdsByHold, emptiedHoldIds }
}

export async function recordHoldRelease(
  release: HoldRelease,
  archivedAt: Date,
  userId: number,
): Promise<void> {
  for (const [holdId, assetIds] of release.releasedAssetIdsByHold) {
    await recordCollectionAssetDelta('Hold', 'hold_id', holdId, [], assetIds, userId)
  }
  for (const holdId of release.emptiedHoldIds) {
    await recordHoldArchive(holdId, archivedAt, userId)
  }
}

async function getNewHoldNumber(): Promise<string> {
  const sequence = await getNextSequence('hold')
  return `H-${String(sequence).padStart(7, '0')}`
}

export async function patchHoldMetadata(
  holdNumber: string,
  metadata: UpdateHoldMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.hold.findUnique({
    where: { hold_number: holdNumber },
    select: { id: true, created_for_id: true, customer_id: true, notes: true, archived_at: true },
  })
  if (!current) throw new NotFoundError(`Hold ${holdNumber} not found`)
  if (current.archived_at) throw new ConflictError('Cannot edit an archived hold')

  await prisma.hold.update({
    where: { id: current.id },
    data: {
      created_for_id: metadata.created_for.id,
      customer_id: metadata.customer.id,
      notes: metadata.notes,
    },
  })

  await recordHoldUpdate(
    current.id,
    {
      created_for_id: current.created_for_id,
      customer_id: current.customer_id,
    },
    {
      created_for_id: metadata.created_for.id,
      customer_id: metadata.customer.id,
    },
    userId,
  )
}

export async function addRemoveCollectionFromAssetsAndRecord(
  holdNumber: string,
  delta: AssetDelta,
  userId: number,
): Promise<void> {
  const [heldStatus, inStockStatus, hold] = await Promise.all([
    prisma.status.findUniqueOrThrow({ where: { status: ASSET_STATUS.HELD }, select: { id: true } }),
    prisma.status.findUniqueOrThrow({
      where: { status: ASSET_STATUS.IN_STOCK },
      select: { id: true },
    }),
    prisma.hold.findUnique({
      where: { hold_number: holdNumber },
      select: { id: true, archived_at: true },
    }),
  ])
  if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
  if (hold.archived_at) throw new ConflictError('Cannot edit an archived hold')

  const now = new Date()

  const { addedPriorAssets, removedPriorAssets, archived } = await prisma.$transaction(
    async (tx) => {
      const [addedPrior, removedPrior] = await Promise.all([
        tx.asset.findMany({
          where: { id: { in: delta.assetIdsToAdd } },
          select: { id: true, status_id: true },
        }),
        tx.asset.findMany({
          where: { id: { in: delta.assetIdsToRemove } },
          select: { id: true, status_id: true },
        }),
      ])
      await addRemoveCollectionFromAssets(tx, {
        assetsToAdd: delta.assetIdsToAdd,
        assetsToRemove: delta.assetIdsToRemove,
        assetInCollectionWhere: { hold_id: { not: null } },
        assetInCollectionError: (barcodes) =>
          new ConflictError(
            `The following assets already have an active hold: ${barcodes.join(', ')}`,
          ),
        add: { hold_id: hold.id, status_id: heldStatus.id },
        remove: { hold_id: null, status_id: inStockStatus.id },
      })

      let archived = false
      if (delta.assetIdsToRemove.length > 0) {
        const remaining = await tx.asset.count({ where: { hold_id: hold.id } })
        if (remaining === 0) {
          await tx.hold.update({ where: { id: hold.id }, data: { archived_at: now } })
          archived = true
        }
      }

      return { addedPriorAssets: addedPrior, removedPriorAssets: removedPrior, archived }
    },
  )

  await recordCollectionAssetDelta(
    'Hold',
    'hold_id',
    hold.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId,
  )

  await recordAssetStatusChange(addedPriorAssets, heldStatus.id, userId)
  await recordAssetStatusChange(removedPriorAssets, inStockStatus.id, userId)

  if (archived) await recordHoldArchive(hold.id, now, userId)
}

export async function moveAssetsToHold(
  sourceHoldNumber: string,
  destinationHoldNumber: string,
  assetIds: number[],
  userId: number,
): Promise<void> {
  if (sourceHoldNumber === destinationHoldNumber) {
    throw new ConflictError('Source and destination holds are the same')
  }

  const [source, destination] = await Promise.all([
    prisma.hold.findUnique({
      where: { hold_number: sourceHoldNumber },
      select: { id: true, archived_at: true },
    }),
    prisma.hold.findUnique({
      where: { hold_number: destinationHoldNumber },
      select: { id: true, archived_at: true },
    }),
  ])
  if (!source) throw new NotFoundError(`Hold ${sourceHoldNumber} not found`)
  if (!destination) throw new NotFoundError(`Hold ${destinationHoldNumber} not found`)
  if (source.archived_at) throw new ConflictError('Cannot move assets out of an archived hold')
  if (destination.archived_at) throw new ConflictError('Cannot move assets into an archived hold')

  const now = new Date()

  const { archived } = await prisma.$transaction(async (tx) => {
    const assets = await tx.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, hold_id: true },
    })
    if (assets.length !== assetIds.length || assets.some((a) => a.hold_id !== source.id)) {
      throw new ConflictError(
        `The following assets are no longer on hold ${sourceHoldNumber} and cannot be moved`,
      )
    }

    await tx.asset.updateMany({
      where: { id: { in: assetIds }, hold_id: source.id },
      data: { hold_id: destination.id },
    })

    const remaining = await tx.asset.count({ where: { hold_id: source.id } })
    let archived = false
    if (remaining === 0) {
      await tx.hold.update({ where: { id: source.id }, data: { archived_at: now } })
      archived = true
    }

    return { archived }
  })

  await recordCollectionMoveOnAssets(assetIds, 'hold_id', source.id, destination.id, userId)
  await recordAssetUpdateOnCollection('Hold', source.id, [], assetIds, userId)
  await recordAssetUpdateOnCollection('Hold', destination.id, assetIds, [], userId)

  if (archived) await recordHoldArchive(source.id, now, userId)
}

export async function getHold(holdNumber: string, role: AppRole | null): Promise<HoldDetail> {
  const [hold, assets] = await Promise.all([
    prisma.hold.findUnique({
      where: { hold_number: holdNumber },
      include: {
        created_by: true,
        created_for: true,
        customer: true,
      },
    }),
    prisma.$queryRawTyped(getAssetsForHold(holdNumber)),
  ])
  if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
  return {
    hold_number: hold.hold_number,
    created_by: mapUser(hold.created_by),
    created_for: mapUser(hold.created_for),
    customer: hold.customer,
    notes: hold.notes,
    created_at: hold.created_at,
    from_dt: hold.from_dt,
    to_dt: hold.to_dt,
    archived_at: hold.archived_at,
    assets: assets.map((r) => redactSearchRowCost(mapAssetSearchRow(r), role)),
  }
}

export async function archiveHold(holdNumber: string, userId: number): Promise<void> {
  const inStockStatus = await prisma.status.findUniqueOrThrow({
    where: { status: ASSET_STATUS.IN_STOCK },
    select: { id: true },
  })

  const now = new Date()

  const { holdId, releasedAssets } = await prisma.$transaction(async (tx) => {
    const hold = await tx.hold.findUnique({
      where: { hold_number: holdNumber },
      select: { id: true, archived_at: true },
    })
    if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
    if (hold.archived_at) throw new ConflictError('Hold is already archived')

    const heldAssets = await tx.asset.findMany({
      where: { hold_id: hold.id },
      select: { id: true, status_id: true },
    })
    const releasedAssetIds = heldAssets.map((a) => a.id)

    await tx.hold.update({
      where: { id: hold.id },
      data: { archived_at: now },
    })

    if (releasedAssetIds.length > 0) {
      await addRemoveCollectionFromAssets(tx, {
        assetsToAdd: [],
        assetsToRemove: releasedAssetIds,
        assetInCollectionWhere: { hold_id: { not: null } },
        assetInCollectionError: (barcodes) =>
          new ConflictError(
            `The following assets already have an active hold: ${barcodes.join(', ')}`,
          ),
        add: { hold_id: hold.id },
        remove: { hold_id: null, status_id: inStockStatus.id },
      })
    }

    return { holdId: hold.id, releasedAssets: heldAssets }
  })

  await recordHoldArchive(holdId, now, userId)
  if (releasedAssets.length > 0) {
    const releasedAssetIds = releasedAssets.map((a) => a.id)
    await recordCollectionAssetDelta('Hold', 'hold_id', holdId, [], releasedAssetIds, userId)
    await recordAssetStatusChange(releasedAssets, inStockStatus.id, userId)
  }
}
