import { AppRole, AssetDelta, CreateHold, HoldDetail, UpdateHoldMetadata } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForHold } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { mapAssetSummary } from '../lib/asset-mappers.js'
import { recordAssetUpdate, recordAssetUpdateOnCollection, recordCollectionUpdateOnAssets, recordHoldArchive, recordHoldCreate, recordHoldUpdate } from './historyService.js'
import { prisma } from '../prisma.js'


export async function createHold(data: CreateHold, userId: number): Promise<string> {
  const assetIds = data.assets.map(a => a.id)

  const heldStatus = await prisma.status.findUniqueOrThrow({
    where: { status: 'HELD' },
    select: { id: true }
  })

  const now = new Date()
  const holdNumber = await getNewHoldNumber()

  const { hold, assetStateMap } = await prisma.$transaction(async (tx) => {
    const conflicting = await tx.asset.findMany({
      where: { id: { in: assetIds }, hold_id: { not: null } },
      select: { barcode: true }
    })
    if (conflicting.length > 0) {
      throw new ConflictError(
        `The following assets already have an active hold: ${conflicting.map(a => a.barcode).join(', ')}`
      )
    }

    const currentAssets = await tx.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, hold_id: true }
    })
    const assetStateMap = new Map(currentAssets.map(a => [a.id, { hold_id: a.hold_id }]))

    const hold = await tx.hold.create({
      data: {
        hold_number: holdNumber,
        created_by: { connect: { id: userId } },
        created_for: { connect: { id: data.created_for_id } },
        customer: { connect: { id: data.customer_id } },
        notes: data.notes ?? null,
        created_at: now,
        from_dt: now,
        to_dt: null,
        assets: { connect: assetIds.map(id => ({ id })) }
      },
      select: { id: true }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { status_id: heldStatus.id }
    })

    return { hold, assetStateMap }
  })

  await recordHoldCreate(hold.id, {
    hold_number: holdNumber,
    created_for_id: data.created_for_id,
    customer_id: data.customer_id,
    created_at: now
  }, userId)

  for (const assetId of assetIds) {
    const prev = assetStateMap.get(assetId)
    await recordAssetUpdate(assetId, { hold_id: prev?.hold_id ?? null }, { hold_id: hold.id }, userId)
  }

  await recordAssetUpdateOnCollection('Hold', hold.id, assetIds, [], userId)

  return holdNumber
}

async function getNewHoldNumber(): Promise<string> {
  const sequence = await getNextSequence('hold')
  return `H-${String(sequence).padStart(7, '0')}`
}

export async function patchHoldMetadata(
  holdNumber: string,
  metadata: UpdateHoldMetadata,
  userId: number
): Promise<void> {
  const current = await prisma.hold.findUnique({
    where: { hold_number: holdNumber },
    select: { id: true, created_for_id: true, customer_id: true, notes: true, archived_at: true }
  })
  if (!current) throw new NotFoundError(`Hold ${holdNumber} not found`)
  if (current.archived_at) throw new ConflictError('Cannot edit an archived hold')

  await prisma.hold.update({
    where: { id: current.id },
    data: {
      created_for_id: metadata.created_for.id,
      customer_id: metadata.customer.id,
      notes: metadata.notes
    }
  })

  await recordHoldUpdate(current.id, {
    created_for_id: current.created_for_id,
    customer_id: current.customer_id
  }, {
    created_for_id: metadata.created_for.id,
    customer_id: metadata.customer.id
  }, userId)
}

export async function patchHoldAssets(
  holdNumber: string,
  delta: AssetDelta,
  userId: number
): Promise<void> {
  const [heldStatus, inStockStatus, hold] = await Promise.all([
    prisma.status.findUniqueOrThrow({ where: { status: 'HELD' }, select: { id: true } }),
    prisma.status.findUniqueOrThrow({ where: { status: 'IN_STOCK' }, select: { id: true } }),
    prisma.hold.findUnique({ where: { hold_number: holdNumber }, select: { id: true, archived_at: true } })
  ])
  if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
  if (hold.archived_at) throw new ConflictError('Cannot edit an archived hold')

  await prisma.$transaction(async (tx) => {
    await applyHoldAssetDelta(
      tx,
      hold.id,
      delta.assetIdsToAdd,
      delta.assetIdsToRemove,
      heldStatus.id,
      inStockStatus.id
    )
  })

  await recordCollectionUpdateOnAssets(
    delta.assetIdsToRemove,
    delta.assetIdsToAdd,
    'hold_id',
    hold.id,
    userId
  )
  await recordAssetUpdateOnCollection(
    'Hold',
    hold.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId
  )
}

async function applyHoldAssetDelta(
  tx: Prisma.TransactionClient,
  holdId: number,
  assetIdsToAdd: number[],
  assetIdsToRemove: number[],
  heldStatusId: number,
  inStockStatusId: number
): Promise<void> {
  if (assetIdsToAdd.length > 0) {
    const conflicts = await tx.asset.findMany({
      where: { id: { in: assetIdsToAdd }, hold_id: { not: null } },
      select: { barcode: true }
    })
    if (conflicts.length > 0) {
      throw new ConflictError(
        `The following assets already have an active hold: ${conflicts.map(a => a.barcode).join(', ')}`
      )
    }
  }

  if (assetIdsToAdd.length > 0 || assetIdsToRemove.length > 0) {
    await tx.hold.update({
      where: { id: holdId },
      data: {
        assets: {
          disconnect: assetIdsToRemove.map(id => ({ id })),
          connect: assetIdsToAdd.map(id => ({ id }))
        }
      }
    })
  }

  if (assetIdsToRemove.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { status_id: inStockStatusId }
    })
  }

  if (assetIdsToAdd.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { status_id: heldStatusId }
    })
  }
}

export async function getHold(holdNumber: string): Promise<HoldDetail> {
  const [hold, assets] = await Promise.all([
    prisma.hold.findUnique({
      where: { hold_number: holdNumber },
      include: {
        created_by: true,
        created_for: true,
        customer: true
      }
    }),
    prisma.$queryRawTyped(getAssetsForHold(holdNumber))
  ])
  if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
  return {
    hold_number: hold.hold_number,
    created_by: {
      id: hold.created_by.id,
      name: hold.created_by.name,
      email: hold.created_by.email,
      is_active: hold.created_by.is_active,
      role: hold.created_by.role as AppRole | null,
      clerk_id: hold.created_by.clerk_id,
    },
    created_for: {
      id: hold.created_for.id,
      name: hold.created_for.name,
      email: hold.created_for.email,
      is_active: hold.created_for.is_active,
      role: hold.created_for.role as AppRole | null,
      clerk_id: hold.created_for.clerk_id,
    },
    customer: hold.customer,
    notes: hold.notes,
    created_at: hold.created_at,
    from_dt: hold.from_dt,
    to_dt: hold.to_dt,
    archived_at: hold.archived_at,
    assets: assets.map(mapAssetSummary)
  }
}

export async function archiveHold(holdNumber: string, userId: number): Promise<void> {
  const inStockStatus = await prisma.status.findUniqueOrThrow({
    where: { status: 'IN_STOCK' },
    select: { id: true }
  })

  const now = new Date()

  const { holdId, releasedAssetIds } = await prisma.$transaction(async (tx) => {
    const hold = await tx.hold.findUnique({
      where: { hold_number: holdNumber },
      select: { id: true, archived_at: true }
    })
    if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
    if (hold.archived_at) throw new ConflictError('Hold is already archived')

    const heldAssets = await tx.asset.findMany({
      where: { hold_id: hold.id },
      select: { id: true }
    })
    const releasedAssetIds = heldAssets.map(a => a.id)

    await tx.hold.update({
      where: { id: hold.id },
      data: { archived_at: now }
    })

    if (releasedAssetIds.length > 0) {
      await applyHoldAssetDelta(tx, hold.id, [], releasedAssetIds, 0, inStockStatus.id)
    }

    return { holdId: hold.id, releasedAssetIds }
  })

  await recordHoldArchive(holdId, now, userId)
  if (releasedAssetIds.length > 0) {
    await recordCollectionUpdateOnAssets(releasedAssetIds, [], 'hold_id', holdId, userId)
    await recordAssetUpdateOnCollection('Hold', holdId, [], releasedAssetIds, userId)
  }
}
