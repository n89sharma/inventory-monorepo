import { format } from 'date-fns'
import { ApiResponse, CreateHold, HoldDetail, response400, response500, successResponse } from 'shared-types'
import { getAssetsForHold } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { prisma } from '../prisma.js'

const DEFAULT_CREATED_BY_ID = 178

export async function createHold(data: CreateHold): Promise<ApiResponse<string>> {
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

    const now = new Date()
    const holdNumber = await getNewHoldNumber(now)

    await prisma.$transaction([
      prisma.hold.create({
        data: {
          hold_number: holdNumber,
          created_by: { connect: { id: DEFAULT_CREATED_BY_ID } },
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
        data: { is_held: true }
      })
    ])

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
        username: hold.created_by.username,
        name: hold.created_by.name,
        email: hold.created_by.email,
        role_id: hold.created_by.role_id,
        role: hold.created_by.Role.role
      },
      created_for: {
        id: hold.created_for.id,
        username: hold.created_for.username,
        name: hold.created_for.name,
        email: hold.created_for.email,
        role_id: hold.created_for.role_id,
        role: hold.created_for.Role.role
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
