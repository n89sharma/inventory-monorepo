import { format } from 'date-fns'
import { ApiResponse, ArrivalDetail, CreateArrival, CreateAsset, response400, response500, successResponse, UpdateArrival } from 'shared-types'
import { getAssetsForArrival } from '../../generated/prisma/sql.js'
import { prisma } from "../prisma.js"

const sequenceArrivalEntity = 'ARRIVAL'
const sequenceAssetEntity = 'ASSET'

const arrivalLocation = 'ARRIVAL'
const arrivalTrackingStatus = 'RECEIVING'
const arrivalAvailabilityStatus = 'AVAILABLE'

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
      created_by: arrival.created_by?.email,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch arrival ${arrivalNumber}`)
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
      assets: {
        create: newArrival.assets.map(a => mapAssetForArrivalCreation(
          a,
          barcodes,
          newArrival.warehouse.id,
          currentDateTime))
      }
    }
  })

  return arrival.arrival_number
}

function mapAssetForArrivalCreation(
  asset: CreateAsset,
  barcodes: Record<string, string>,
  warehouseId: number,
  currentDateTime: Date) {

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

async function getNextSequence(entityType: string, warehouseCode: string, date: Date): Promise<number> {
  const formattedDate = format(date, 'yyyy-MM-dd')
  const result = await prisma.$queryRaw<[{ get_next_sequence: number }]>`SELECT get_next_sequence(${entityType}, ${warehouseCode}, ${formattedDate})`
  return result[0].get_next_sequence
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
        ...mapAssetForArrivalCreation(asset, barcodes, arrival.warehouse.id, currentDateTime),
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
