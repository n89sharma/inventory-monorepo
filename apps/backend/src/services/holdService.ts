import { format } from 'date-fns'
import { ApiResponse, CreateHold, HoldDetail, UpdateHold, response400, response500, successResponse } from 'shared-types'
import { getAssetsForHold } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { recordAssetUpdate, recordAssetUpdateOnCollection, recordCollectionUpdateOnAssets, recordHoldCreate, recordHoldUpdate } from './historyService.js'
import { prisma } from '../prisma.js'


export async function createHold(data: CreateHold, userId: number): Promise<ApiResponse<string>> {
  try {
    const assetIds = data.assets.map(a => a.id)

    const conflicting = await prisma.asset.findMany({
      where: { id: { in: assetIds }, is_held: true },
      select: { barcode: true }
    })
    if (conflicting.length > 0) {
      const barcodes = conflicting.map(a => a.barcode).join(', ')
      return response400(`The following assets already have an active hold: ${barcodes}`)
    }

    const [currentAssets, heldStatus] = await Promise.all([
      prisma.asset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, hold_id: true, is_held: true }
      }),
      prisma.availabilityStatus.findUniqueOrThrow({ where: { status: 'HELD' }, select: { id: true } })
    ])
    const assetStateMap = new Map(currentAssets.map(a => [a.id, { hold_id: a.hold_id, is_held: a.is_held }]))

    const now = new Date()
    const holdNumber = await getNewHoldNumber(now)

    await prisma.$transaction([
      prisma.hold.create({
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
        }
      }),
      prisma.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { is_held: true, availability_status_id: heldStatus.id }
      })
    ])

    const hold = await prisma.hold.findUnique({ where: { hold_number: holdNumber }, select: { id: true } })
    if (hold) {
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
    }

    return successResponse(holdNumber)
  } catch (error) {
    return response500('Failed to create hold')
  }
}

async function getNewHoldNumber(date: Date): Promise<string> {
  const formattedDate = format(date, 'yyMMdd')
  const sequence = await getNextSequence('HOLD', '', date)
  return `H-${formattedDate}-${String(sequence).padStart(3, '0')}`
}

export async function getHoldForUpdate(holdNumber: string): Promise<ApiResponse<UpdateHold>> {
  try {
    const [hold, assets] = await Promise.all([
      prisma.hold.findUnique({
        where: { hold_number: holdNumber },
        include: {
          created_for: { include: { Role: true } },
          customer: true
        }
      }),
      prisma.$queryRawTyped(getAssetsForHold(holdNumber))
    ])
    if (!hold) {
      return response400(`Hold ${holdNumber} not found`)
    }
    return successResponse({
      id: hold.id,
      created_for: {
        id: hold.created_for.id,
        name: hold.created_for.name,
        email: hold.created_for.email ?? '',
        role_id: hold.created_for.role_id ?? 0,
        role: hold.created_for.Role?.role ?? ''
      },
      customer: {
        id: hold.customer.id,
        account_number: hold.customer.account_number,
        name: hold.customer.name
      },
      notes: hold.notes,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch hold ${holdNumber} for edit`)
  }
}

export async function updateHold(data: UpdateHold, userId: number): Promise<ApiResponse<void>> {
  try {
    const holdRecord = await prisma.hold.findUnique({
      where: { id: data.id },
      include: { assets: { select: { id: true } } }
    })
    if (!holdRecord) {
      return response400(`Hold not found`)
    }

    const existingAssetIds = holdRecord.assets.map(a => a.id)
    const incomingAssetIds = new Set(data.assets.map(a => a.id))
    const assetIdsToRemove = existingAssetIds.filter(id => !incomingAssetIds.has(id))
    const assetIdsToAdd = data.assets.map(a => a.id).filter(id => !existingAssetIds.includes(id))

    const [conflicts, heldStatus, availableStatus] = await Promise.all([
      assetIdsToAdd.length > 0
        ? prisma.asset.findMany({
            where: { id: { in: assetIdsToAdd }, is_held: true },
            select: { barcode: true }
          })
        : Promise.resolve([]),
      prisma.availabilityStatus.findUniqueOrThrow({ where: { status: 'HELD' }, select: { id: true } }),
      prisma.availabilityStatus.findUniqueOrThrow({ where: { status: 'AVAILABLE' }, select: { id: true } })
    ])

    if (conflicts.length > 0) {
      const barcodes = conflicts.map(a => a.barcode).join(', ')
      return response400(`The following assets already have an active hold: ${barcodes}`)
    }

    await prisma.$transaction([
      prisma.hold.update({
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
      }),
      prisma.asset.updateMany({
        where: { id: { in: assetIdsToRemove } },
        data: { is_held: false, availability_status_id: availableStatus.id }
      }),
      prisma.asset.updateMany({
        where: { id: { in: assetIdsToAdd } },
        data: { is_held: true, availability_status_id: heldStatus.id }
      })
    ])

    await recordHoldUpdate(data.id, {
      created_for_id: holdRecord.created_for_id,
      customer_id: holdRecord.customer_id
    }, {
      created_for_id: data.created_for.id,
      customer_id: data.customer.id
    }, userId)

    await recordCollectionUpdateOnAssets(assetIdsToRemove, assetIdsToAdd, 'hold_id', data.id, userId)
    await recordAssetUpdateOnCollection('Hold', data.id, assetIdsToAdd, assetIdsToRemove, userId)

    return successResponse(undefined)
  } catch (error) {
    return response500('Failed to update hold')
  }
}

export async function getHold(holdNumber: string): Promise<ApiResponse<HoldDetail>> {
  try {
    const [hold, assets] = await Promise.all([
      prisma.hold.findUnique({
        where: { hold_number: holdNumber },
        include: {
          created_by: { include: { Role: true } },
          created_for: { include: { Role: true } },
          customer: true
        }
      }),
      prisma.$queryRawTyped(getAssetsForHold(holdNumber))
    ])
    if (!hold) {
      return response400(`Hold ${holdNumber} not found`)
    }
    return successResponse({
      hold_number: hold.hold_number,
      created_by: {
        id: hold.created_by.id,
        name: hold.created_by.name,
        email: hold.created_by.email ?? '',
        role_id: hold.created_by.role_id ?? 0,
        role: hold.created_by.Role?.role ?? ''
      },
      created_for: {
        id: hold.created_for.id,
        name: hold.created_for.name,
        email: hold.created_for.email ?? '',
        role_id: hold.created_for.role_id ?? 0,
        role: hold.created_for.Role?.role ?? ''
      },
      customer: hold.customer,
      notes: hold.notes,
      created_at: hold.created_at,
      from_dt: hold.from_dt,
      to_dt: hold.to_dt,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch hold ${holdNumber}`)
  }
}
