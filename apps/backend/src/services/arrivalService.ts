import { format } from 'date-fns'
import { ApiResponse, ArrivalDetail, CreateArrival, CreateAsset, response400, response500, successResponse, UpdateArrival } from 'shared-types'
import { AssetCreateWithoutArrivalInput, AssetDefaultArgs } from '../../generated/prisma/models.js'
import { ArrivalDefaultArgs, ArrivalGetPayload } from '../../generated/prisma/models/Arrival.js'
import { getAssetsForArrival } from '../../generated/prisma/sql.js'
import { mapDbModelToSummaryModel } from '../controllers/modelController.js'
import { getNextSequence } from '../lib/db-utils.js'
import { prisma } from "../prisma.js"

const sequenceArrivalEntity = 'ARRIVAL'
const sequenceAssetEntity = 'ASSET'

const arrivalLocation = 'ARRIVAL'
const arrivalTrackingStatus = 'RECEIVING'
const arrivalAvailabilityStatus = 'AVAILABLE'

const DEFAULT_CREATED_BY_ID = 178

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
      created_by: arrival.created_by.email,
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

export async function createArrival(newArrival: CreateArrival) {
  const warehouseCode = newArrival.warehouse.city_code
  const currentDateTime = new Date()
  const barcodes = await generateBarcodes(newArrival.assets, warehouseCode, currentDateTime)

  const arrival = await prisma.arrival.create({
    data: {
      arrival_number: await getNewArrivalNumber(warehouseCode, currentDateTime),
      origin: { connect: { id: newArrival.vendor.id } },
      destination: { connect: { id: newArrival.warehouse.id } },
      transporter: { connect: { id: newArrival.transporter.id } },
      notes: newArrival.comment,
      created_at: currentDateTime,
      created_by: { connect: { id: DEFAULT_CREATED_BY_ID } },
      assets: {
        create: newArrival.assets.map(a => mapInputAssetToPrismaCreateAsset(
          a,
          barcodes,
          newArrival.warehouse.id,
          currentDateTime))
      }
    }
  })

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


export async function updateArrival(arrival: UpdateArrival) {
  const existingAssetIds = (await prisma.asset.findMany({
    where: { arrival_id: arrival.id },
    select: { id: true }
  })).map(a => a.id)

  const receivedAssetIds = new Set(arrival.assets.map(a => a.id).filter(id => id != null))
  const assetIdsToBeDeleted = existingAssetIds.filter(id => !receivedAssetIds.has(id))

  const assetsToUpdate = arrival.assets.filter(a => !!a.id)
  const assetsToCreate = arrival.assets.filter(a => a.id === undefined || a.id === null)

  let assetCreates: ReturnType<typeof prisma.asset.create>[] = []
  if (assetsToCreate.length > 0) {
    const warehouseCode = arrival.warehouse.city_code
    const currentDateTime = new Date()
    const barcodes = await generateBarcodes(assetsToCreate, warehouseCode, currentDateTime)
    assetCreates = assetsToCreate.map(asset => prisma.asset.create({
      data: {
        ...mapInputAssetToPrismaCreateAsset(asset, barcodes, arrival.warehouse.id, currentDateTime),
        arrival: { connect: { id: arrival.id } }
      }
    }))
  }

  const assetUpdates = assetsToUpdate.map(asset =>
    prisma.asset.update({
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
  )

  const accessoryDeletes = assetsToUpdate.map(asset =>
    prisma.assetAccessory.deleteMany({
      where: { asset_id: asset.id }
    })
  )

  const accessoryCreates = assetsToUpdate.flatMap(asset =>
    asset.coreFunctions.map(cf =>
      prisma.assetAccessory.create({
        data: {
          asset_id: asset.id!,
          accessory_id: cf.id
        }
      })
    )
  )

  await prisma.$transaction([
    prisma.asset.updateMany({ where: { id: { in: assetIdsToBeDeleted } }, data: { arrival_id: null } }),
    prisma.arrival.update({
      where: { id: arrival.id },
      data: {
        origin_id: arrival.vendor.id,
        transporter_id: arrival.transporter.id,
        destination_id: arrival.warehouse.id,
        notes: arrival.comment
      }
    }),
    ...assetUpdates,
    ...accessoryDeletes,
    ...accessoryCreates,
    ...assetCreates
  ])
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

