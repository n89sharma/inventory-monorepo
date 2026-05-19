import { AppRole, AssetDelta, CreateHold, HoldDetail, UpdateHold, UpdateHoldMetadata } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForHold } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { recordAssetUpdate, recordAssetUpdateOnCollection, recordCollectionUpdateOnAssets, recordHoldCreate, recordHoldUpdate } from './historyService.js'
import { prisma } from '../prisma.js'


export async function createHold(data: CreateHold, userId: number): Promise<string> {
  const assetIds = data.assets.map(a => a.id)

  const heldStatus = await prisma.availabilityStatus.findUniqueOrThrow({
    where: { status: 'HELD' },
    select: { id: true }
  })

  const now = new Date()
  const holdNumber = await getNewHoldNumber()

  const { hold, assetStateMap } = await prisma.$transaction(async (tx) => {
    const conflicting = await tx.asset.findMany({
      where: { id: { in: assetIds }, is_held: true },
      select: { barcode: true }
    })
    if (conflicting.length > 0) {
      throw new ConflictError(
        `The following assets already have an active hold: ${conflicting.map(a => a.barcode).join(', ')}`
      )
    }

    const currentAssets = await tx.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, hold_id: true, is_held: true }
    })
    const assetStateMap = new Map(currentAssets.map(a => [a.id, { hold_id: a.hold_id, is_held: a.is_held }]))

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
      data: { is_held: true, availability_status_id: heldStatus.id }
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

export async function getHoldForUpdate(holdNumber: string): Promise<UpdateHold> {
  const [hold, assets] = await Promise.all([
    prisma.hold.findUnique({
      where: { hold_number: holdNumber },
      include: {
        created_for: true,
        customer: true
      }
    }),
    prisma.$queryRawTyped(getAssetsForHold(holdNumber))
  ])
  if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
  return {
    id: hold.id,
    created_for: {
      id: hold.created_for.id,
      name: hold.created_for.name,
      email: hold.created_for.email,
      is_active: hold.created_for.is_active,
      role: hold.created_for.role as AppRole | null,
      clerk_id: hold.created_for.clerk_id,
    },
    customer: {
      id: hold.customer.id,
      account_number: hold.customer.account_number,
      name: hold.customer.name
    },
    notes: hold.notes,
    assets
  }
}

export async function updateHold(data: UpdateHold, userId: number): Promise<void> {
  const [heldStatus, availableStatus] = await Promise.all([
    prisma.availabilityStatus.findUniqueOrThrow({ where: { status: 'HELD' }, select: { id: true } }),
    prisma.availabilityStatus.findUniqueOrThrow({ where: { status: 'AVAILABLE' }, select: { id: true } })
  ])

  const { holdRecord, assetIdsToRemove, assetIdsToAdd } = await prisma.$transaction(async (tx) => {
    const holdRecord = await tx.hold.findUnique({
      where: { id: data.id },
      include: { assets: { select: { id: true } } }
    })
    if (!holdRecord) throw new NotFoundError('Hold not found')

    const existingAssetIds = holdRecord.assets.map(a => a.id)
    const incomingAssetIds = new Set(data.assets.map(a => a.id))
    const assetIdsToRemove = existingAssetIds.filter(id => !incomingAssetIds.has(id))
    const assetIdsToAdd = data.assets.map(a => a.id).filter(id => !existingAssetIds.includes(id))

    if (assetIdsToAdd.length > 0) {
      const conflicts = await tx.asset.findMany({
        where: { id: { in: assetIdsToAdd }, is_held: true },
        select: { barcode: true }
      })
      if (conflicts.length > 0) {
        throw new ConflictError(
          `The following assets already have an active hold: ${conflicts.map(a => a.barcode).join(', ')}`
        )
      }
    }

    await tx.hold.update({
      where: { id: data.id },
      data: {
        created_for_id: data.created_for.id,
        customer_id: data.customer.id,
        notes: data.notes ?? null,
        assets: {
          disconnect: assetIdsToRemove.map(id => ({ id })),
          connect: assetIdsToAdd.map(id => ({ id }))
        }
      }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { is_held: false, availability_status_id: availableStatus.id }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { is_held: true, availability_status_id: heldStatus.id }
    })

    return { holdRecord, assetIdsToRemove, assetIdsToAdd }
  })

  await recordHoldUpdate(data.id, {
    created_for_id: holdRecord.created_for_id,
    customer_id: holdRecord.customer_id
  }, {
    created_for_id: data.created_for.id,
    customer_id: data.customer.id
  }, userId)

  await recordCollectionUpdateOnAssets(assetIdsToRemove, assetIdsToAdd, 'hold_id', data.id, userId)
  await recordAssetUpdateOnCollection('Hold', data.id, assetIdsToAdd, assetIdsToRemove, userId)
}

export async function patchHoldMetadata(
  holdNumber: string,
  metadata: UpdateHoldMetadata,
  userId: number
): Promise<void> {
  const current = await prisma.hold.findUnique({
    where: { hold_number: holdNumber },
    select: { id: true, created_for_id: true, customer_id: true, notes: true }
  })
  if (!current) throw new NotFoundError(`Hold ${holdNumber} not found`)

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
  const [heldStatus, availableStatus, hold] = await Promise.all([
    prisma.availabilityStatus.findUniqueOrThrow({ where: { status: 'HELD' }, select: { id: true } }),
    prisma.availabilityStatus.findUniqueOrThrow({ where: { status: 'AVAILABLE' }, select: { id: true } }),
    prisma.hold.findUnique({ where: { hold_number: holdNumber }, select: { id: true } })
  ])
  if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)

  await prisma.$transaction(async (tx) => {
    await applyHoldAssetDelta(
      tx,
      hold.id,
      delta.assetIdsToAdd,
      delta.assetIdsToRemove,
      heldStatus.id,
      availableStatus.id
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
  availableStatusId: number
): Promise<void> {
  if (assetIdsToAdd.length > 0) {
    const conflicts = await tx.asset.findMany({
      where: { id: { in: assetIdsToAdd }, is_held: true },
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
      data: { is_held: false, availability_status_id: availableStatusId }
    })
  }

  if (assetIdsToAdd.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { is_held: true, availability_status_id: heldStatusId }
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
    assets
  }
}
