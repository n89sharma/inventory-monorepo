import {
  AssetDelta,
  CreateDeparture,
  DEFAULT_OUTGOING_STATUS,
  DepartureDetail,
  OutgoingStatus,
  OutgoingStatusSchema,
  UpdateDepartureMetadata,
} from 'shared-types'
import { getAssetsForDepartures } from '../../generated/prisma/sql.js'
import { mapAssetSummary } from '../lib/asset-mappers.js'
import {
  addRemoveCollectionFromAssets,
  assertAssetsNotInCollection,
  recordCollectionAssetDelta,
} from '../lib/collection-assets.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  recordAssetStatusChange,
  recordDepartureCreate,
  recordDepartureUpdate,
} from './historyService.js'

export async function getDeparture(departureNumber: string): Promise<DepartureDetail> {
  const [departure, assets] = await Promise.all([
    prisma.departure.findUnique({
      where: { departure_number: departureNumber },
      include: { origin: true, destination: true, transporter: true, created_by: true },
    }),
    prisma.$queryRawTyped(getAssetsForDepartures(departureNumber)),
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
    assets: assets.map(mapAssetSummary),
  }
}

export async function createDeparture(departure: CreateDeparture, userId: number): Promise<string> {
  const originCode = departure.origin.city_code
  const currentDateTime = new Date()
  const departureNumber = await getNewDepartureNumber(originCode)
  const assetIds = departure.assets.map((a) => a.id)
  const assetsPerOutgoingStatus = Object.groupBy(departure.assets, (asset) => asset.outgoing_status)

  const outgoingStatusRows = await prisma.status.findMany({
    where: { status: { in: [...OutgoingStatusSchema.options] } },
  })
  const statusIdByName = new Map(outgoingStatusRows.map((s) => [s.status, s.id]))

  const referencedStatuses = Object.keys(assetsPerOutgoingStatus)
  const unseededStatuses = referencedStatuses.filter((s) => !statusIdByName.has(s))
  if (unseededStatuses.length > 0)
    throw new Error(`Outgoing statuses not seeded in DB: ${unseededStatuses.join(', ')}`)

  const { newDeparture, priorStatusByAsset } = await prisma.$transaction(async (tx) => {
    await assertAssetsNotInCollection(
      tx,
      assetIds,
      { departure_id: { not: null } },
      (barcodes) =>
        new ConflictError(`Assets already assigned to a departure: ${barcodes.join(', ')}`),
    )

    const created = await tx.departure.create({
      data: {
        departure_number: departureNumber,
        origin: { connect: { id: departure.origin.id } },
        destination: { connect: { id: departure.customer.id } },
        transporter: { connect: { id: departure.transporter.id } },
        created_by: { connect: { id: userId } },
        notes: departure.comment,
        created_at: currentDateTime,
      },
    })

    const priorAssets = await tx.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, status_id: true },
    })

    for (const [outgoingStatus, assetsForStatus] of Object.entries(assetsPerOutgoingStatus)) {
      if (!assetsForStatus) continue
      await tx.asset.updateMany({
        where: { id: { in: assetsForStatus.map((a) => a.id) } },
        data: {
          departure_id: created.id,
          status_id: statusIdByName.get(outgoingStatus)!,
        },
      })
    }

    return {
      newDeparture: created,
      priorStatusByAsset: new Map(priorAssets.map((a) => [a.id, a.status_id])),
    }
  })

  await recordDepartureCreate(
    newDeparture.id,
    {
      departure_number: departureNumber,
      origin_id: departure.origin.id,
      destination_id: departure.customer.id,
      created_at: currentDateTime,
    },
    userId,
  )

  await recordCollectionAssetDelta(
    'Departure',
    'departure_id',
    newDeparture.id,
    assetIds,
    [],
    userId,
  )

  for (const [outgoingStatus, assetsForStatus] of Object.entries(assetsPerOutgoingStatus)) {
    if (!assetsForStatus) continue
    const priorAssets = assetsForStatus.map((a) => ({
      id: a.id,
      status_id: priorStatusByAsset.get(a.id)!,
    }))
    await recordAssetStatusChange(priorAssets, statusIdByName.get(outgoingStatus)!, userId)
  }

  return departureNumber
}

export async function patchDepartureMetadata(
  departureNumber: string,
  metadata: UpdateDepartureMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true, origin_id: true, destination_id: true, transporter_id: true, notes: true },
  })
  if (!current) throw new NotFoundError(`Departure ${departureNumber} not found`)

  await prisma.departure.update({
    where: { id: current.id },
    data: {
      origin_id: metadata.origin.id,
      destination_id: metadata.customer.id,
      transporter_id: metadata.transporter.id,
      notes: metadata.comment,
    },
  })

  await recordDepartureUpdate(
    current.id,
    {
      origin_id: current.origin_id,
      destination_id: current.destination_id,
      transporter_id: current.transporter_id,
    },
    {
      origin_id: metadata.origin.id,
      destination_id: metadata.customer.id,
      transporter_id: metadata.transporter.id,
    },
    userId,
  )
}

export async function addAssetsToDepartureAndRecord(
  departureNumber: string,
  delta: AssetDelta,
  userId: number,
): Promise<void> {
  if (delta.assetIdsToRemove.length > 0)
    throw new ConflictError('Assets cannot be removed from a departure')

  const departure = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true },
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)

  const addStatus = await prisma.status.findUniqueOrThrow({
    where: { status: DEFAULT_OUTGOING_STATUS },
    select: { id: true },
  })

  const priorAssets = await prisma.$transaction(async (tx) => {
    const prior = await tx.asset.findMany({
      where: { id: { in: delta.assetIdsToAdd } },
      select: { id: true, status_id: true },
    })
    await addRemoveCollectionFromAssets(tx, {
      assetsToAdd: delta.assetIdsToAdd,
      assetsToRemove: [],
      assetInCollectionWhere: { departure_id: { not: null } },
      assetInCollectionError: (barcodes) =>
        new ConflictError(`Assets already assigned to a departure: ${barcodes.join(', ')}`),
      add: { departure_id: departure.id, status_id: addStatus.id },
      remove: {},
    })
    return prior
  })

  await recordCollectionAssetDelta(
    'Departure',
    'departure_id',
    departure.id,
    delta.assetIdsToAdd,
    [],
    userId,
  )

  await recordAssetStatusChange(priorAssets, addStatus.id, userId)
}

export async function setDepartureOutgoingStatus(
  departureNumber: string,
  assetIds: number[],
  outgoingStatus: OutgoingStatus,
  userId: number,
): Promise<void> {
  const departure = await prisma.departure.findUnique({
    where: { departure_number: departureNumber },
    select: { id: true },
  })
  if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)

  const status = await prisma.status.findUniqueOrThrow({
    where: { status: outgoingStatus },
    select: { id: true },
  })

  const priorAssets = await prisma.$transaction(async (tx) => {
    const assets = await tx.asset.findMany({
      where: { id: { in: assetIds }, departure_id: departure.id },
      select: { id: true, status_id: true },
    })
    if (assets.length !== assetIds.length)
      throw new ConflictError('Some assets do not belong to this departure')

    await tx.asset.updateMany({
      where: { id: { in: assetIds }, departure_id: departure.id },
      data: { status_id: status.id },
    })
    return assets
  })

  await recordAssetStatusChange(priorAssets, status.id, userId)
}

async function getNewDepartureNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('departure')
  return `D-${originCode}-${String(sequence).padStart(7, '0')}`
}
