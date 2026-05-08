import { CreateDeparture, DepartureDetail, UpdateDeparture } from 'shared-types'
import { getAssetsForDepartures } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { recordAssetUpdateOnCollection, recordCollectionUpdateOnAssets, recordDepartureCreate, recordDepartureUpdate } from './historyService.js'
import { prisma } from '../prisma.js'



export async function getDeparture(departureNumber: string): Promise<DepartureDetail> {
  const [departure, assets] = await Promise.all([
    prisma.departure.findUnique({
      where: { departure_number: departureNumber },
      include: { origin: true, destination: true, transporter: true, created_by: true }
    }),
    prisma.$queryRawTyped(getAssetsForDepartures(departureNumber))
  ])
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
  return {
    departure_number: departure.departure_number,
    origin: departure.origin,
    customer: departure.destination,
    transporter: departure.transporter,
    notes: departure.notes,
    created_at: departure.created_at,
    created_by: departure.created_by?.name,
    assets
  }
}

export async function getDepartureForUpdate(departureNumber: string): Promise<UpdateDeparture> {
  const [departure, assets] = await Promise.all([
    prisma.departure.findUnique({
      where: { departure_number: departureNumber },
      include: { origin: true, destination: true, transporter: true }
    }),
    prisma.$queryRawTyped(getAssetsForDepartures(departureNumber))
  ])
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
  return {
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
  }
}

export async function createDeparture(departure: CreateDeparture, userId: number): Promise<string> {
  const originCode = departure.origin.city_code
  const currentDateTime = new Date()
  const departureNumber = await getNewDepartureNumber(originCode)
  const assetIds = departure.assets.map(a => a.id)

  const newDeparture = await prisma.$transaction(async (tx) => {
    const assetsAlreadyOnDeparture = await tx.asset.findMany({
      where: { id: { in: assetIds }, departure_id: { not: null } },
      select: { barcode: true }
    })
    if (assetsAlreadyOnDeparture.length > 0) {
      throw new ConflictError(
        `Assets already assigned to a departure: ${assetsAlreadyOnDeparture.map(a => a.barcode).join(', ')}`
      )
    }

    const created = await tx.departure.create({
      data: {
        departure_number: departureNumber,
        origin: { connect: { id: departure.origin.id } },
        destination: { connect: { id: departure.customer.id } },
        transporter: { connect: { id: departure.transporter.id } },
        created_by: { connect: { id: userId } },
        notes: departure.comment,
        created_at: currentDateTime
      }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { departure_id: created.id }
    })

    return created
  })

  await recordDepartureCreate(newDeparture.id, {
    departure_number: departureNumber,
    origin_id: departure.origin.id,
    destination_id: departure.customer.id,
    created_at: currentDateTime
  }, userId)

  await recordCollectionUpdateOnAssets([], assetIds, 'departure_id', newDeparture.id, userId)
  await recordAssetUpdateOnCollection('Departure', newDeparture.id, assetIds, [], userId)

  return departureNumber
}

export async function updateDeparture(departure: UpdateDeparture, userId: number): Promise<void> {
  const { currentDeparture, assetIdsToRemove, assetIdsToAdd } = await prisma.$transaction(async (tx) => {
    const [currentDeparture, existingAssets] = await Promise.all([
      tx.departure.findUnique({
        where: { id: departure.id },
        select: { origin_id: true, destination_id: true, transporter_id: true, notes: true }
      }),
      tx.asset.findMany({ where: { departure_id: departure.id }, select: { id: true } })
    ])

    const existingAssetIds = existingAssets.map(a => a.id)
    const incomingAssetIds = new Set(departure.assets.map(a => a.id))
    const assetIdsToRemove = existingAssetIds.filter(id => !incomingAssetIds.has(id))
    const assetIdsToAdd = departure.assets.map(a => a.id).filter(id => !existingAssetIds.includes(id))

    if (assetIdsToAdd.length > 0) {
      const conflicts = await tx.asset.findMany({
        where: { id: { in: assetIdsToAdd }, departure_id: { not: null } },
        select: { barcode: true }
      })
      if (conflicts.length > 0) {
        throw new ConflictError(
          `Assets already assigned to a departure: ${conflicts.map(a => a.barcode).join(', ')}`
        )
      }
    }

    await tx.departure.update({
      where: { id: departure.id },
      data: {
        origin_id: departure.origin.id,
        destination_id: departure.customer.id,
        transporter_id: departure.transporter.id,
        notes: departure.comment
      }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { departure_id: null }
    })

    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { departure_id: departure.id }
    })

    return { currentDeparture, assetIdsToRemove, assetIdsToAdd }
  })

  await recordDepartureUpdate(departure.id, {
    origin_id: currentDeparture?.origin_id,
    destination_id: currentDeparture?.destination_id,
    transporter_id: currentDeparture?.transporter_id
  }, {
    origin_id: departure.origin.id,
    destination_id: departure.customer.id,
    transporter_id: departure.transporter.id
  }, userId)

  await recordCollectionUpdateOnAssets(assetIdsToRemove, assetIdsToAdd, 'departure_id', departure.id, userId)
  await recordAssetUpdateOnCollection('Departure', departure.id, assetIdsToAdd, assetIdsToRemove, userId)
}

async function getNewDepartureNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('departure')
  return `D-${originCode}-${String(sequence).padStart(7, '0')}`
}
