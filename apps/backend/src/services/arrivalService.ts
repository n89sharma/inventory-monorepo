import { format } from 'date-fns'
import { ApiResponse, ArrivalDetail, CreateArrival, CreateAsset, response400, response500, successResponse, UpdateArrival } from 'shared-types'
import { AssetCreateWithoutArrivalInput, AssetDefaultArgs } from '../../generated/prisma/models.js'
import { ArrivalDefaultArgs, ArrivalGetPayload } from '../../generated/prisma/models/Arrival.js'
import { getAssetsForArrival } from '../../generated/prisma/sql.js'
import { mapDbModelToSummaryModel } from '../controllers/modelController.js'
import { getNextSequence } from '../lib/db-utils.js'
import { recordArrivalCreate, recordArrivalUpdate, recordAssetUpdate, recordAssetUpdateOnCollection, recordBatchAssetCreate, recordCollectionUpdateOnAssets } from './historyService.js'
import { prisma } from "../prisma.js"

const sequenceArrivalEntity = 'ARRIVAL'
const sequenceAssetEntity = 'ASSET'

const arrivalLocation = 'ARRIVAL'
const arrivalTrackingStatus = 'RECEIVING'
const arrivalAvailabilityStatus = 'AVAILABLE'


const assetIncludeArgs = {
  include: {
    model: true,
    TechnicalStatus: true,
    technical_specification: true,
    asset_accessories: {
      include: {
        Accessory: true
      }
    }
  }
} satisfies AssetDefaultArgs

const arrivalIncludeArgs = {
  include: {
    origin: true,
    destination: true,
    transporter: true,
    assets: assetIncludeArgs
  }
} satisfies ArrivalDefaultArgs

type UpdateArrivalDb = ArrivalGetPayload<typeof arrivalIncludeArgs>

export async function getArrival(arrivalNumber: string): Promise<ApiResponse<ArrivalDetail>> {
  try {
    const [arrival, assets] = await Promise.all([
      prisma.arrival.findUnique({
        where: { arrival_number: arrivalNumber },
        include: { origin: true, destination: true, transporter: true, created_by: true }
      }),
      prisma.$queryRawTyped(getAssetsForArrival(arrivalNumber))
    ])
    if (!arrival) {
      return response400(`Arrival ${arrivalNumber} not found`)
    }
    return successResponse({
      arrival_number: arrival.arrival_number,
      vendor: arrival.origin,
      transporter: arrival.transporter,
      warehouse: arrival.destination,
      comment: arrival.notes,
      created_at: arrival.created_at,
      created_by: arrival.created_by.name,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch arrival ${arrivalNumber}`)
  }
}


export async function getArrivalForUpdate(arrivalNumber: string): Promise<ApiResponse<UpdateArrival>> {
  try {
    const dbArrival = await prisma.arrival.findUnique({
      where: { arrival_number: arrivalNumber },
      ...arrivalIncludeArgs
    })
    if (!dbArrival) {
      return response400(`Arrival ${arrivalNumber} not found`)
    }
    return successResponse(await mapDbToGetUpdateArrival(dbArrival))
  } catch (error) {
    return response500(`Failed to fetch arrival ${arrivalNumber} for edit`)
  }
}

async function mapDbToGetUpdateArrival(dbArrival: UpdateArrivalDb): Promise<UpdateArrival> {
  const { origin, destination, transporter, notes, assets } = dbArrival
  const models = await Promise.all(assets.map(a => mapDbModelToSummaryModel(a.model_id)))

  return {
    id: dbArrival.id,
    vendor: origin,
    warehouse: destination,
    transporter: transporter,
    comment: notes,
    assets: assets.map((a, i) => ({
      id: a.id,
      model: models[i],
      serialNumber: a.serial_number,
      meterBlack: a.technical_specification?.meter_black ?? 0,
      meterColour: a.technical_specification?.meter_colour ?? 0,
      cassettes: a.technical_specification?.cassettes ?? 0,
      technicalStatus: a.TechnicalStatus,
      internalFinisher: a.technical_specification?.internal_finisher ?? '',
      coreFunctions: a.asset_accessories.map(ac => ac.Accessory)
    }))
  }
}

export async function createArrival(newArrival: CreateArrival, userId: number) {
  const warehouseCode = newArrival.warehouse.city_code
  const currentDateTime = new Date()
  const barcodes = await generateBarcodes(newArrival.assets, warehouseCode, currentDateTime)
  const arrivalNumber = await getNewArrivalNumber(warehouseCode, currentDateTime)

  const arrival = await prisma.arrival.create({
    data: {
      arrival_number: arrivalNumber,
      origin: { connect: { id: newArrival.vendor.id } },
      destination: { connect: { id: newArrival.warehouse.id } },
      transporter: { connect: { id: newArrival.transporter.id } },
      notes: newArrival.comment,
      created_at: currentDateTime,
      created_by: { connect: { id: userId } },
      assets: {
        create: newArrival.assets.map(a => mapInputAssetToPrismaCreateAsset(a, barcodes, newArrival.warehouse.id, currentDateTime))
      }
    },
    include: {
      assets: {
        select: {
          id: true, barcode: true, serial_number: true, model_id: true,
          tracking_status_id: true, availability_status_id: true, technical_status_id: true
        }
      }
    }
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
  barcodes: Record<string, string>,
  warehouseId: number,
  currentDateTime: Date): AssetCreateWithoutArrivalInput {

  return {
    barcode: barcodes[asset.serialNumber],
    serial_number: asset.serialNumber,
    model: { connect: { id: asset.model.id } },
    Location: { connect: { warehouse_id_location: { warehouse_id: warehouseId, location: arrivalLocation } } },
    created_at: currentDateTime,
    is_held: false,
    TrackingStatus: { connect: { status: arrivalTrackingStatus } },
    AvailabilityStatus: { connect: { status: arrivalAvailabilityStatus } },
    TechnicalStatus: { connect: { id: asset.technicalStatus.id } },
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


export async function updateArrival(arrival: UpdateArrival, userId: number) {
  const assetsToUpdate = arrival.assets.filter(a => !!a.id)
  const assetsToCreate = arrival.assets.filter(a => a.id === undefined || a.id === null)

  // Generate barcodes for new assets outside the transaction (sequence function is atomic)
  let newAssetBarcodes: Record<string, string> = {}
  const newAssetDateTime = new Date()
  if (assetsToCreate.length > 0) {
    newAssetBarcodes = await generateBarcodes(assetsToCreate, arrival.warehouse.city_code, newAssetDateTime)
  }

  const { currentArrival, existingAssets, existingAssetIds, assetIdsToBeDeleted, newAssets } =
    await prisma.$transaction(async (tx) => {
      const [currentArrival, existingAssets] = await Promise.all([
        tx.arrival.findUnique({
          where: { id: arrival.id },
          select: { origin_id: true, destination_id: true, transporter_id: true, notes: true }
        }),
        tx.asset.findMany({
          where: { arrival_id: arrival.id },
          select: {
            id: true,
            model_id: true,
            serial_number: true,
            technical_status_id: true,
            technical_specification: {
              select: { meter_black: true, meter_colour: true, cassettes: true, internal_finisher: true }
            }
          }
        })
      ])

      const existingAssetIds = existingAssets.map(a => a.id)
      const receivedAssetIds = new Set(arrival.assets.map(a => a.id).filter(id => id != null))
      const assetIdsToBeDeleted = existingAssetIds.filter(id => !receivedAssetIds.has(id))

      await tx.asset.updateMany({
        where: { id: { in: assetIdsToBeDeleted } },
        data: { arrival_id: null }
      })

      await tx.arrival.update({
        where: { id: arrival.id },
        data: {
          origin_id: arrival.vendor.id,
          transporter_id: arrival.transporter.id,
          destination_id: arrival.warehouse.id,
          notes: arrival.comment
        }
      })

      if (assetsToUpdate.length > 0) {
        await tx.assetAccessory.deleteMany({
          where: { asset_id: { in: assetsToUpdate.map(a => a.id!) } }
        })
      }

      const allNewAccessories: { asset_id: number; accessory_id: number }[] = []
      for (const asset of assetsToUpdate) {
        await tx.asset.update({
          where: { id: asset.id },
          data: {
            model_id: asset.model.id,
            serial_number: asset.serialNumber,
            technical_status_id: asset.technicalStatus.id,
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
        for (const cf of asset.coreFunctions) {
          allNewAccessories.push({ asset_id: asset.id!, accessory_id: cf.id })
        }
      }

      if (allNewAccessories.length > 0) {
        await tx.assetAccessory.createMany({ data: allNewAccessories })
      }

      for (const asset of assetsToCreate) {
        await tx.asset.create({
          data: {
            ...mapInputAssetToPrismaCreateAsset(asset, newAssetBarcodes, arrival.warehouse.id, newAssetDateTime),
            arrival: { connect: { id: arrival.id } }
          }
        })
      }

      const newAssets = assetsToCreate.length > 0
        ? await tx.asset.findMany({
            where: { arrival_id: arrival.id, id: { notIn: existingAssetIds } },
            select: {
              id: true, barcode: true, serial_number: true, model_id: true,
              tracking_status_id: true, availability_status_id: true, technical_status_id: true
            }
          })
        : []

      return { currentArrival, existingAssets, existingAssetIds, assetIdsToBeDeleted, newAssets }
    })

  await recordArrivalUpdate(arrival.id, {
    origin_id: currentArrival?.origin_id,
    destination_id: currentArrival?.destination_id,
    transporter_id: currentArrival?.transporter_id
  }, {
    origin_id: arrival.vendor.id,
    destination_id: arrival.warehouse.id,
    transporter_id: arrival.transporter.id
  }, userId)

  await recordCollectionUpdateOnAssets(assetIdsToBeDeleted, [], 'arrival_id', arrival.id, userId)

  await recordBatchAssetCreate(
    newAssets.map(a => ({
      id: a.id,
      barcode: a.barcode,
      serial_number: a.serial_number,
      model_id: a.model_id,
      arrival_id: arrival.id
    })),
    userId
  )

  await recordAssetUpdateOnCollection('Arrival', arrival.id, newAssets.map(a => a.id), assetIdsToBeDeleted, userId)

  for (const asset of assetsToUpdate) {
    const existing = existingAssets.find(a => a.id === asset.id)
    if (!existing) continue
    await recordAssetUpdate(asset.id!, {
      model_id: existing.model_id,
      serial_number: existing.serial_number,
      technical_status_id: existing.technical_status_id,
      meter_black: existing.technical_specification?.meter_black,
      meter_colour: existing.technical_specification?.meter_colour,
      cassettes: existing.technical_specification?.cassettes,
      internal_finisher: existing.technical_specification?.internal_finisher
    }, {
      model_id: asset.model.id,
      serial_number: asset.serialNumber,
      technical_status_id: asset.technicalStatus.id,
      meter_black: asset.meterBlack,
      meter_colour: asset.meterColour,
      cassettes: asset.cassettes,
      internal_finisher: asset.internalFinisher
    }, userId)
  }
}

async function generateBarcodes(assets: CreateAsset[], warehouseCode: string, date: Date) {
  const barcodes: Record<string, string> = {}
  for (const asset of assets) {
    barcodes[asset.serialNumber] = await getNewAssetBarcode(warehouseCode, date)
  }
  return barcodes
}

async function getNewArrivalNumber(warehouseCode: string, date: Date): Promise<string> {
  const formattedDate = format(date, 'yyMMdd')
  const sequence = await getNextSequence(sequenceArrivalEntity, warehouseCode, date)
  return `A${warehouseCode}-${formattedDate}-${String(sequence).padStart(3, '0')}`
}

async function getNewAssetBarcode(warehouseCode: string, date: Date): Promise<string> {
  const formattedDate = format(date, 'yyMMdd')
  const sequence = await getNextSequence(sequenceAssetEntity, warehouseCode, date)
  return `${warehouseCode}-${formattedDate}-${String(sequence).padStart(4, '0')}`
}
