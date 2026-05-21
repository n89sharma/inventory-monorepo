import { AssetDelta, CreateDeparture, DepartureDetail, UpdateDepartureMetadata } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForDepartures } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { mapAssetSummary } from './assetService.js'
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
    assets: assets.map(mapAssetSummary)
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

export async function patchDepartureMetadata(
  departureNumber: string,
  metadata: UpdateDepartureMetadata,
  userId: number
): Promise<void> {
  const current = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true, origin_id: true, destination_id: true, transporter_id: true, notes: true }
  })
  if (!current) throw new NotFoundError(`Departure ${departureNumber} not found`)

  await prisma.departure.update({
    where: { id: current.id },
    data: {
      origin_id: metadata.origin.id,
      destination_id: metadata.customer.id,
      transporter_id: metadata.transporter.id,
      notes: metadata.comment
    }
  })

  await recordDepartureUpdate(current.id, {
    origin_id: current.origin_id,
    destination_id: current.destination_id,
    transporter_id: current.transporter_id
  }, {
    origin_id: metadata.origin.id,
    destination_id: metadata.customer.id,
    transporter_id: metadata.transporter.id
  }, userId)
}

export async function patchDepartureAssets(
  departureNumber: string,
  delta: AssetDelta,
  userId: number
): Promise<void> {
  const departure = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true }
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)

  await prisma.$transaction(async (tx) => {
    await applyAssetDelta(tx, departure.id, delta.assetIdsToAdd, delta.assetIdsToRemove)
  })

  await recordCollectionUpdateOnAssets(
    delta.assetIdsToRemove,
    delta.assetIdsToAdd,
    'departure_id',
    departure.id,
    userId
  )
  await recordAssetUpdateOnCollection(
    'Departure',
    departure.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId
  )
}

async function applyAssetDelta(
  tx: Prisma.TransactionClient,
  departureId: number,
  assetIdsToAdd: number[],
  assetIdsToRemove: number[]
): Promise<void> {
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

  if (assetIdsToRemove.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { departure_id: null }
    })
  }

  if (assetIdsToAdd.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { departure_id: departureId }
    })
  }
}

async function getNewDepartureNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('departure')
  return `D-${originCode}-${String(sequence).padStart(7, '0')}`
}
