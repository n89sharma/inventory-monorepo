import { ApiResponse, HoldDetail, response400, response500, successResponse } from 'shared-types'
import { getAssetsForHold } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

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
