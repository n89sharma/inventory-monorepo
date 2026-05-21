import { ArrivalDetail, AssetDelta, AssetSummary, CreateArrival, CreateAsset, ModelSummary, UpdateArrivalMetadata, UpdateAsset } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { AssetCreateWithoutArrivalInput, AssetDefaultArgs } from '../../generated/prisma/models.js'
import { AssetGetPayload } from '../../generated/prisma/models/Asset.js'
import { getAssetByBarcode, getAssetsForArrival } from '../../generated/prisma/sql.js'
import { mapDbModelToSummaryModel } from '../controllers/modelController.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from "../prisma.js"
import { mapAssetSummary } from './assetService.js'
import { recordArrivalCreate, recordArrivalUpdate, recordAssetUpdate, recordAssetUpdateOnCollection, recordBatchAssetCreate, recordCollectionUpdateOnAssets } from './historyService.js'


const arrivalZone = 'SHIPPING_AND_RECEIVING'
const arrivalStatus = 'IN_STOCK'

async function ensureArrivalLocationId(
  tx: Prisma.TransactionClient,
  warehouseId: number
): Promise<number> {
  const zone = await tx.zone.findUnique({ where: { zone: arrivalZone }, select: { id: true } })
  if (!zone) throw new NotFoundError(`Zone ${arrivalZone} not found`)
  const location = await tx.location.upsert({
    where: {
      warehouse_id_zone_id_bin: { warehouse_id: warehouseId, zone_id: zone.id, bin: '' }
    },
    create: { warehouse_id: warehouseId, zone_id: zone.id, bin: '' },
    update: {}
  })
  return location.id
}


const assetIncludeArgs = {
  include: {
    model: true,
    Readiness: true,
    technical_specification: true,
    asset_accessories: {
      include: {
        Accessory: true
      }
    }
  }
} satisfies AssetDefaultArgs

type UpdateArrivalAssetDb = AssetGetPayload<typeof assetIncludeArgs>

export async function getArrival(arrivalNumber: string): Promise<ArrivalDetail> {
  const [arrival, assets] = await Promise.all([
    prisma.arrival.findUnique({
      where: { arrival_number: arrivalNumber },
      include: { origin: true, destination: true, transporter: true, created_by: true }
    }),
    prisma.$queryRawTyped(getAssetsForArrival(arrivalNumber))
  ])
  if (!arrival) throw new NotFoundError(`Arrival ${arrivalNumber} not found`)
  return {
    arrival_number: arrival.arrival_number,
    vendor: arrival.origin,
    transporter: arrival.transporter,
    warehouse: arrival.destination,
    comment: arrival.notes,
    created_at: arrival.created_at,
    created_by: arrival.created_by.name,
    assets: assets.map(mapAssetSummary)
  }
}


function mapDbAssetToUpdateAsset(dbAsset: UpdateArrivalAssetDb, model: ModelSummary): UpdateAsset {
  return {
    id: dbAsset.id,
    model,
    serialNumber: dbAsset.serial_number,
    meterBlack: dbAsset.technical_specification?.meter_black ?? 0,
    meterColour: dbAsset.technical_specification?.meter_colour ?? 0,
    cassettes: dbAsset.technical_specification?.cassettes ?? 0,
    readiness: dbAsset.Readiness,
    internalFinisher: dbAsset.technical_specification?.internal_finisher ?? '',
    coreFunctions: dbAsset.asset_accessories.map(ac => ac.Accessory)
  }
}

export async function createArrival(newArrival: CreateArrival, userId: number) {
  const warehouseCode = newArrival.warehouse.city_code
  const currentDateTime = new Date()
  const barcodes = await generateBarcodes(newArrival.assets, warehouseCode)
  const arrivalNumber = await getNewArrivalNumber(warehouseCode)

  const arrival = await prisma.$transaction(async (tx) => {
    const locationId = await ensureArrivalLocationId(tx, newArrival.warehouse.id)
    return tx.arrival.create({
      data: {
        arrival_number: arrivalNumber,
        origin: { connect: { id: newArrival.vendor.id } },
        destination: { connect: { id: newArrival.warehouse.id } },
        transporter: { connect: { id: newArrival.transporter.id } },
        notes: newArrival.comment,
        created_at: currentDateTime,
        created_by: { connect: { id: userId } },
        assets: {
          create: newArrival.assets.map(a => mapInputAssetToPrismaCreateAsset(a, barcodes[a.serialNumber], locationId, currentDateTime))
        }
      },
      include: {
        assets: {
          select: {
            id: true, barcode: true, serial_number: true, model_id: true,
            status_id: true, readiness_id: true
          }
        }
      }
    })
  })

  await recordArrivalCreate(arrival.id, {
    arrival_number: arrivalNumber,
    origin_id: newArrival.vendor.id,
    destination_id: newArrival.warehouse.id,
    created_at: currentDateTime
  }, userId)

  await recordBatchAssetCreate(
    arrival.assets.map(a => ({
      id: a.id,
      barcode: a.barcode,
      serial_number: a.serial_number,
      model_id: a.model_id,
      arrival_id: arrival.id
    })),
    userId
  )

  await recordAssetUpdateOnCollection('Arrival', arrival.id, arrival.assets.map(a => a.id), [], userId)

  return arrival.arrival_number
}

function mapInputAssetToPrismaCreateAsset(
  asset: CreateAsset,
  barcode: string,
  locationId: number,
  currentDateTime: Date): AssetCreateWithoutArrivalInput {

  return {
    barcode,
    serial_number: asset.serialNumber,
    model: { connect: { id: asset.model.id } },
    Location: { connect: { id: locationId } },
    created_at: currentDateTime,
    Status: { connect: { status: arrivalStatus } },
    Readiness: { connect: { id: asset.readiness.id } },
    asset_accessories: {
      create: asset.coreFunctions.map(c => ({ accessory_id: c.id }))
    },
    technical_specification: {
      create: {
        meter_black: asset.meterBlack,
        meter_colour: asset.meterColour,
        meter_total: asset.meterBlack + asset.meterColour,
        internal_finisher: asset.internalFinisher,
        cassettes: asset.cassettes
      }
    },
    cost: { create: {} }
  }
}


export async function patchArrivalMetadata(
  arrivalNumber: string,
  metadata: UpdateArrivalMetadata,
  userId: number
): Promise<void> {
  const current = await prisma.arrival.findUnique({
    where: { arrival_number: arrivalNumber },
    select: { id: true, origin_id: true, destination_id: true, transporter_id: true, notes: true }
  })
  if (!current) throw new NotFoundError(`Arrival ${arrivalNumber} not found`)

  await prisma.arrival.update({
    where: { id: current.id },
    data: {
      origin_id: metadata.vendor.id,
      destination_id: metadata.warehouse.id,
      transporter_id: metadata.transporter.id,
      notes: metadata.comment
    }
  })

  await recordArrivalUpdate(current.id, {
    origin_id: current.origin_id,
    destination_id: current.destination_id,
    transporter_id: current.transporter_id
  }, {
    origin_id: metadata.vendor.id,
    destination_id: metadata.warehouse.id,
    transporter_id: metadata.transporter.id
  }, userId)
}

export async function patchArrivalAssets(
  arrivalNumber: string,
  delta: AssetDelta,
  userId: number
): Promise<void> {
  const arrival = await prisma.arrival.findUnique({
    where: { arrival_number: arrivalNumber },
    select: { id: true }
  })
  if (!arrival) throw new NotFoundError(`Arrival ${arrivalNumber} not found`)

  await prisma.$transaction(async (tx) => {
    await applyArrivalAssetDelta(tx, arrival.id, delta.assetIdsToAdd, delta.assetIdsToRemove)
  })

  await recordCollectionUpdateOnAssets(
    delta.assetIdsToRemove,
    delta.assetIdsToAdd,
    'arrival_id',
    arrival.id,
    userId
  )
  await recordAssetUpdateOnCollection(
    'Arrival',
    arrival.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId
  )
}

async function applyArrivalAssetDelta(
  tx: Prisma.TransactionClient,
  arrivalId: number,
  assetIdsToAdd: number[],
  assetIdsToRemove: number[]
): Promise<void> {
  if (assetIdsToAdd.length > 0) {
    const conflicts = await tx.asset.findMany({
      where: { id: { in: assetIdsToAdd }, arrival_id: { not: null } },
      select: { barcode: true }
    })
    if (conflicts.length > 0) {
      throw new ConflictError(
        `Assets already assigned to an arrival: ${conflicts.map(a => a.barcode).join(', ')}`
      )
    }
  }

  if (assetIdsToRemove.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToRemove } },
      data: { arrival_id: null }
    })
  }

  if (assetIdsToAdd.length > 0) {
    await tx.asset.updateMany({
      where: { id: { in: assetIdsToAdd } },
      data: { arrival_id: arrivalId }
    })
  }
}

async function updateArrivalAssetCoreFields(
  tx: Prisma.TransactionClient,
  asset: UpdateAsset
): Promise<void> {
  await tx.asset.update({
    where: { id: asset.id! },
    data: {
      model_id: asset.model.id,
      serial_number: asset.serialNumber,
      readiness_id: asset.readiness.id,
      technical_specification: {
        update: {
          meter_black: asset.meterBlack,
          meter_colour: asset.meterColour,
          meter_total: asset.meterBlack + asset.meterColour,
          cassettes: asset.cassettes,
          internal_finisher: asset.internalFinisher
        }
      }
    }
  })
}

export async function getArrivalAssetForUpdate(
  arrivalNumber: string,
  assetId: number
): Promise<UpdateAsset> {
  const dbAsset = await prisma.asset.findFirst({
    where: { id: assetId, arrival: { arrival_number: arrivalNumber } },
    ...assetIncludeArgs
  })
  if (!dbAsset) throw new NotFoundError(`Asset ${assetId} not found on arrival ${arrivalNumber}`)
  const model = await mapDbModelToSummaryModel(dbAsset.model_id)
  return mapDbAssetToUpdateAsset(dbAsset, model)
}

export async function updateArrivalAsset(
  arrivalNumber: string,
  assetId: number,
  asset: UpdateAsset,
  userId: number
): Promise<AssetSummary> {
  const existing = await prisma.asset.findFirst({
    where: { id: assetId, arrival: { arrival_number: arrivalNumber } },
    select: {
      id: true, barcode: true, model_id: true, serial_number: true, readiness_id: true,
      technical_specification: {
        select: { meter_black: true, meter_colour: true, cassettes: true, internal_finisher: true }
      }
    }
  })
  if (!existing) throw new NotFoundError(`Asset ${assetId} not found on arrival ${arrivalNumber}`)

  const assetWithId: UpdateAsset = { ...asset, id: assetId }

  await prisma.$transaction(async (tx) => {
    await tx.assetAccessory.deleteMany({ where: { asset_id: assetId } })
    await updateArrivalAssetCoreFields(tx, assetWithId)
    if (asset.coreFunctions.length > 0) {
      await tx.assetAccessory.createMany({
        data: asset.coreFunctions.map(cf => ({ asset_id: assetId, accessory_id: cf.id }))
      })
    }
  })

  await recordAssetUpdate(assetId, {
    model_id: existing.model_id,
    serial_number: existing.serial_number,
    readiness_id: existing.readiness_id,
    meter_black: existing.technical_specification?.meter_black,
    meter_colour: existing.technical_specification?.meter_colour,
    cassettes: existing.technical_specification?.cassettes,
    internal_finisher: existing.technical_specification?.internal_finisher
  }, {
    model_id: asset.model.id,
    serial_number: asset.serialNumber,
    readiness_id: asset.readiness.id,
    meter_black: asset.meterBlack,
    meter_colour: asset.meterColour,
    cassettes: asset.cassettes,
    internal_finisher: asset.internalFinisher
  }, userId)

  const [summary] = await prisma.$queryRawTyped(getAssetByBarcode(existing.barcode))
  if (!summary) throw new NotFoundError(`Asset ${existing.barcode} not found after update`)
  return mapAssetSummary(summary)
}

async function createArrivalAssetInTx(
  tx: Prisma.TransactionClient,
  arrivalId: number,
  asset: CreateAsset,
  barcode: string,
  locationId: number,
  now: Date
) {
  return tx.asset.create({
    data: {
      ...mapInputAssetToPrismaCreateAsset(asset, barcode, locationId, now),
      arrival: { connect: { id: arrivalId } }
    },
    select: {
      id: true, barcode: true, serial_number: true, model_id: true,
      status_id: true, readiness_id: true
    }
  })
}

export async function createSingleArrivalAsset(
  arrivalNumber: string,
  asset: CreateAsset,
  userId: number
): Promise<AssetSummary> {
  const arrival = await prisma.arrival.findUnique({
    where: { arrival_number: arrivalNumber },
    select: { id: true, destination_id: true, destination: { select: { city_code: true } } }
  })
  if (!arrival) throw new NotFoundError(`Arrival ${arrivalNumber} not found`)

  const barcode = await getNewAssetBarcode(arrival.destination.city_code)
  const now = new Date()

  const created = await prisma.$transaction(async (tx) => {
    const locationId = await ensureArrivalLocationId(tx, arrival.destination_id)
    return createArrivalAssetInTx(tx, arrival.id, asset, barcode, locationId, now)
  })

  await recordBatchAssetCreate(
    [{
      id: created.id,
      barcode: created.barcode,
      serial_number: created.serial_number,
      model_id: created.model_id,
      arrival_id: arrival.id
    }],
    userId
  )
  await recordAssetUpdateOnCollection('Arrival', arrival.id, [created.id], [], userId)

  const [summary] = await prisma.$queryRawTyped(getAssetByBarcode(created.barcode))
  if (!summary) throw new NotFoundError(`Asset ${created.barcode} not found after create`)
  return mapAssetSummary(summary)
}

async function generateBarcodes(assets: CreateAsset[], warehouseCode: string) {
  const barcodes: Record<string, string> = {}
  for (const asset of assets) {
    barcodes[asset.serialNumber] = await getNewAssetBarcode(warehouseCode)
  }
  return barcodes
}

async function getNewArrivalNumber(warehouseCode: string): Promise<string> {
  const sequence = await getNextSequence('arrival')
  return `A-${warehouseCode}-${String(sequence).padStart(7, '0')}`
}

async function getNewAssetBarcode(warehouseCode: string): Promise<string> {
  const sequence = await getNextSequence('asset')
  return `${warehouseCode}-${String(sequence).padStart(7, '0')}`
}
