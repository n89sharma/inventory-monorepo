import { format } from 'date-fns'
import { ApiResponse, CreateDeparture, DepartureDetail, UpdateDeparture, response400, response500, successResponse } from 'shared-types'
import { getAssetsForDepartures } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { prisma } from '../prisma.js'

const sequenceDepartureEntity = 'DEPARTURE'
const DEFAULT_CREATED_BY_ID = 178

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

export async function getDepartureForUpdate(departureNumber: string): Promise<ApiResponse<UpdateDeparture>> {
  try {
    const [departure, assets] = await Promise.all([
      prisma.departure.findUnique({
        where: { departure_number: departureNumber },
        include: { origin: true, destination: true, transporter: true }
      }),
      prisma.$queryRawTyped(getAssetsForDepartures(departureNumber))
    ])
    if (!departure) {
      return response400(`Departure ${departureNumber} not found`)
    }
    return successResponse({
      id: departure.id,
      origin: departure.origin,
      customer: {
        id: departure.destination.id,
        account_number: departure.destination.account_number,
        name: departure.destination.name
      },
      transporter: {
        id: departure.transporter.id,
        account_number: departure.transporter.account_number,
        name: departure.transporter.name
      },
      comment: departure.notes,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch departure ${departureNumber} for edit`)
  }
}

export async function createDeparture(departure: CreateDeparture): Promise<string> {
  const originCode = departure.origin.city_code
  const currentDateTime = new Date()
  const departureNumber = await getNewDepartureNumber(originCode, currentDateTime)

  const assetIds = departure.assets.map(a => a.id)

  const assetsAlreadyOnDeparture = await prisma.asset.findMany({
    where: { id: { in: assetIds }, departure_id: { not: null } },
    select: { barcode: true }
  })
  if (assetsAlreadyOnDeparture.length > 0) {
    const barcodes = assetsAlreadyOnDeparture.map(a => a.barcode).join(', ')
    throw new Error(`Assets already assigned to a departure: ${barcodes}`)
  }

  const newDeparture = await prisma.departure.create({
    data: {
      departure_number: departureNumber,
      origin: { connect: { id: departure.origin.id } },
      destination: { connect: { id: departure.customer.id } },
      transporter: { connect: { id: departure.transporter.id } },
      created_by: { connect: { id: DEFAULT_CREATED_BY_ID } },
      notes: departure.comment,
      created_at: currentDateTime
    }
  })

  await prisma.asset.updateMany({
    where: { id: { in: assetIds } },
    data: { departure_id: newDeparture.id }
  })

  return departureNumber
}

export async function updateDeparture(departure: UpdateDeparture): Promise<void> {
  const existingAssets = await prisma.asset.findMany({
    where: { departure_id: departure.id },
    select: { id: true }
  })
  const existingAssetIds = existingAssets.map(a => a.id)

  const incomingAssetIds = new Set(departure.assets.map(a => a.id))
  const assetIdsToRemove = existingAssetIds.filter(id => !incomingAssetIds.has(id))
  const assetIdsToAdd = departure.assets
    .map(a => a.id)
    .filter(id => !existingAssetIds.includes(id))

  if (assetIdsToAdd.length > 0) {
    const conflicts = await prisma.asset.findMany({
      where: { id: { in: assetIdsToAdd }, departure_id: { not: null } },
      select: { barcode: true }
    })
    if (conflicts.length > 0) {
      const barcodes = conflicts.map(a => a.barcode).join(', ')
      throw new Error(`Assets already assigned to a departure: ${barcodes}`)
    }
  }

  await prisma.$transaction([
    prisma.departure.update({
      where: { id: departure.id },
      data: {
        origin_id: departure.origin.id,
        destination_id: departure.customer.id,
        transporter_id: departure.transporter.id,
        notes: departure.comment
      }
    }),
    prisma.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { departure_id: null }
    }),
    prisma.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { departure_id: departure.id }
    })
  ])
}

async function getNewDepartureNumber(originCode: string, date: Date): Promise<string> {
  const formattedDate = format(date, 'yyMMdd')
  const sequence = await getNextSequence(sequenceDepartureEntity, originCode, date)
  return `D${originCode}-${formattedDate}-${String(sequence).padStart(3, '0')}`
}
