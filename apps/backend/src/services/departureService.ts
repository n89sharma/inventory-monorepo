import { ApiResponse, DepartureDetail, response400, response500, successResponse } from 'shared-types'
import { getAssetsForDepartures } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getDeparture(departureNumber: string): Promise<ApiResponse<DepartureDetail>> {
  try {
    const [departure, assets] = await Promise.all([
      prisma.departure.findUnique({
        where: { departure_number: departureNumber },
        include: { origin: true, destination: true, transporter: true, created_by: true }
      }),
      prisma.$queryRawTyped(getAssetsForDepartures(departureNumber))
    ])
    if (!departure) {
      return response400(`Departure ${departureNumber} not found`)
    }
    return successResponse({
      departure_number: departure.departure_number,
      origin: departure.origin,
      customer: departure.destination,
      transporter: departure.transporter,
      notes: departure.notes,
      created_at: departure.created_at,
      created_by: departure.created_by?.email,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch departure ${departureNumber}`)
  }
}
