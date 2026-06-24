import { ArrivalDetail, AssetDelta, AssetSummary, ASSET_STATUS, CreateArrival, CreateAsset, ModelSummary, UpdateArrivalMetadata, UpdateAsset } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { AssetCreateWithoutArrivalInput, AssetDefaultArgs } from '../../generated/prisma/models.js'
import { AssetGetPayload } from '../../generated/prisma/models/Asset.js'
import { getAssetByBarcode, getAssetsForArrival } from '../../generated/prisma/sql.js'
import { mapDbModelToSummaryModel } from '../controllers/modelController.js'
import { validateComponentBrands } from '../lib/asset-component-validation.js'
import { validateErrorBrands } from '../lib/asset-error-validation.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from "../prisma.js"
import { mapAssetSummary } from '../lib/asset-mappers.js'
import { reconcileAssetErrors } from './assetErrorService.js'
import { upsertLatestComment } from './assetCommentService.js'
import { recordArrivalCreate, recordArrivalUpdate, recordAssetUpdate, recordAssetUpdateOnCollection, recordBatchAssetCreate } from './historyService.js'
import { addRemoveCollectionFromAssets, recordCollectionAssetDelta } from '../lib/collection-assets.js'


const arrivalZone = 'SHIPPING_AND_RECEIVING'
const arrivalStatus = ASSET_STATUS.IN_STOCK

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
    Country: true,
    technical_specification: true,
    asset_accessories: {
      include: {
        Accessory: true
      }
    },
    asset_errors: {
      select: { error_id: true, is_fixed: true }
    },
    // Latest comment only — the edit modal prefills a single textarea.
    // Including the full stream would balloon the payload on long-lived assets.
    comments: {
      take: 1,
      orderBy: { created_at: 'desc' },
      select: { comment: true }
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
    countryOfOrigin: dbAsset.Country,
    manufacturedYear: dbAsset.manufactured_year,
    componentId: dbAsset.technical_specification?.component_id ?? null,
    coreFunctions: dbAsset.asset_accessories.map(ac => ac.Accessory),
    drumLifeC: dbAsset.technical_specification?.drum_life_c ?? 0,
    drumLifeM: dbAsset.technical_specification?.drum_life_m ?? 0,
    drumLifeY: dbAsset.technical_specification?.drum_life_y ?? 0,
    drumLifeK: dbAsset.technical_specification?.drum_life_k ?? 0,
    tonerLifeC: dbAsset.technical_specification?.toner_life_c ?? 0,
    tonerLifeM: dbAsset.technical_specification?.toner_life_m ?? 0,
    tonerLifeY: dbAsset.technical_specification?.toner_life_y ?? 0,
    tonerLifeK: dbAsset.technical_specification?.toner_life_k ?? 0,
    errors: dbAsset.asset_errors.map(r => ({ error_id: r.error_id, is_fixed: r.is_fixed })),
    comment: dbAsset.comments[0]?.comment ?? null
  }
}

export async function createArrival(newArrival: CreateArrival, userId: number) {
  const warehouseCode = newArrival.warehouse.city_code
  const currentDateTime = new Date()
  const barcodes = await generateBarcodes(newArrival.assets, warehouseCode)
  const arrivalNumber = await getNewArrivalNumber(warehouseCode)
  const brandIdByModelId = await resolveModelBrands(newArrival.assets.map(a => a.model.id))

  const arrival = await prisma.$transaction(async (tx) => {
    await validateErrorBrands(tx, buildErrorBrandPairs(newArrival.assets, brandIdByModelId))
    await validateComponentBrands(tx, buildComponentBrandPairs(newArrival.assets, brandIdByModelId))
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
          create: newArrival.assets.map(a => mapInputAssetToPrismaCreateAsset(
            a, barcodes[a.serialNumber], locationId, currentDateTime, userId
          ))
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
  currentDateTime: Date,
  userId: number): AssetCreateWithoutArrivalInput {

  const errors = asset.errors ?? []
  const commentText = asset.comment?.trim() ?? ''

  return {
    barcode,
    serial_number: asset.serialNumber,
    model: { connect: { id: asset.model.id } },
    Location: { connect: { id: locationId } },
    created_at: currentDateTime,
    Status: { connect: { status: arrivalStatus } },
    Readiness: { connect: { id: asset.readiness.id } },
    Country: { connect: { id: asset.countryOfOrigin.id } },
    manufactured_year: asset.manufacturedYear,
    asset_accessories: {
      create: asset.coreFunctions.map(c => ({ accessory_id: c.id }))
    },
    technical_specification: {
      create: {
        meter_black: asset.meterBlack,
        meter_colour: asset.meterColour,
        meter_total: asset.meterBlack + asset.meterColour,
        component_id: asset.componentId,
        cassettes: asset.cassettes,
        drum_life_c: asset.drumLifeC,
        drum_life_m: asset.drumLifeM,
        drum_life_y: asset.drumLifeY,
        drum_life_k: asset.drumLifeK,
        toner_life_c: asset.tonerLifeC,
        toner_life_m: asset.tonerLifeM,
        toner_life_y: asset.tonerLifeY,
        toner_life_k: asset.tonerLifeK
      }
    },
    cost: { create: {} },
    asset_errors: errors.length > 0 ? {
      create: errors.map(e => ({
        error_id: e.error_id,
        is_fixed: e.is_fixed,
        added_by: userId,
        added_at: currentDateTime,
        fixed_at: e.is_fixed ? currentDateTime : null,
        fixed_by: e.is_fixed ? userId : null
      }))
    } : undefined,
    comments: commentText !== '' ? {
      create: [{
        created_by_id: userId,
        comment: commentText,
        created_at: currentDateTime,
        updated_at: currentDateTime
      }]
    } : undefined
  }
}

/**
 * One query to resolve every asset's model → brand_id. The brand is needed to
 * pair each asset's error_ids with its expected brand for validation.
 */
async function resolveModelBrands(modelIds: number[]): Promise<Map<number, number>> {
  if (modelIds.length === 0) return new Map()
  const rows = await prisma.model.findMany({
    where: { id: { in: modelIds } },
    select: { id: true, brand_id: true }
  })
  return new Map(rows.map(r => [r.id, r.brand_id]))
}

/**
 * Flatten the per-asset (model → expected brand, errors) shape into the
 * { errorId, expectedBrandId } pairs that `validateErrorBrands` consumes.
 */
function buildErrorBrandPairs(
  assets: Array<{ model: { id: number }; errors?: { error_id: number }[] }>,
  brandIdByModelId: Map<number, number>
): Array<{ errorId: number; expectedBrandId: number }> {
  return assets.flatMap(a => {
    if (!a.errors || a.errors.length === 0) return []
    const expectedBrandId = brandIdByModelId.get(a.model.id)
    if (expectedBrandId === undefined) {
      throw new NotFoundError(`Model ${a.model.id} not found`)
    }
    return a.errors.map(e => ({ errorId: e.error_id, expectedBrandId }))
  })
}

/**
 * Pair each asset's chosen component (when set) with its model's expected brand
 * for `validateComponentBrands`. Mirrors `buildErrorBrandPairs`.
 */
function buildComponentBrandPairs(
  assets: Array<{ model: { id: number }; componentId?: number | null }>,
  brandIdByModelId: Map<number, number>
): Array<{ componentId: number; expectedBrandId: number }> {
  return assets.flatMap(a => {
    if (a.componentId == null) return []
    const expectedBrandId = brandIdByModelId.get(a.model.id)
    if (expectedBrandId === undefined) {
      throw new NotFoundError(`Model ${a.model.id} not found`)
    }
    return [{ componentId: a.componentId, expectedBrandId }]
  })
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

export async function addRemoveCollectionFromAssetsAndRecord(
  arrivalNumber: string,
  delta: AssetDelta,
  userId: number
): Promise<void> {
  const arrival = await prisma.arrival.findUnique({
    where: { arrival_number: arrivalNumber },
    select: { id: true }
  })
  if (!arrival) throw new NotFoundError(`Arrival ${arrivalNumber} not found`)

  await prisma.$transaction(tx =>
    addRemoveCollectionFromAssets(tx, {
      assetsToAdd: delta.assetIdsToAdd,
      assetsToRemove: delta.assetIdsToRemove,
      assetInCollectionWhere: { arrival_id: { not: null } },
      assetInCollectionError: (barcodes) =>
        new ConflictError(`Assets already assigned to an arrival: ${barcodes.join(', ')}`),
      add: { arrival_id: arrival.id },
      remove: { arrival_id: null }
    })
  )

  await recordCollectionAssetDelta(
    'Arrival',
    'arrival_id',
    arrival.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId
  )
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
      country_of_origin_id: asset.countryOfOrigin?.id ?? null,
      manufactured_year: asset.manufacturedYear,
      technical_specification: {
        update: {
          meter_black: asset.meterBlack,
          meter_colour: asset.meterColour,
          meter_total: asset.meterBlack + asset.meterColour,
          cassettes: asset.cassettes,
          component_id: asset.componentId,
          drum_life_c: asset.drumLifeC,
          drum_life_m: asset.drumLifeM,
          drum_life_y: asset.drumLifeY,
          drum_life_k: asset.drumLifeK,
          toner_life_c: asset.tonerLifeC,
          toner_life_m: asset.tonerLifeM,
          toner_life_y: asset.tonerLifeY,
          toner_life_k: asset.tonerLifeK
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
      country_of_origin_id: true, manufactured_year: true,
      technical_specification: {
        select: {
          meter_black: true, meter_colour: true, cassettes: true, component_id: true,
          drum_life_c: true, drum_life_m: true, drum_life_y: true, drum_life_k: true,
          toner_life_c: true, toner_life_m: true, toner_life_y: true, toner_life_k: true
        }
      }
    }
  })
  if (!existing) throw new NotFoundError(`Asset ${assetId} not found on arrival ${arrivalNumber}`)

  const assetWithId: UpdateAsset = { ...asset, id: assetId }
  const brandIdByModelId = await resolveModelBrands([asset.model.id])

  await prisma.$transaction(async (tx) => {
    await validateErrorBrands(tx, buildErrorBrandPairs([asset], brandIdByModelId))
    await validateComponentBrands(tx, buildComponentBrandPairs([asset], brandIdByModelId))
    await tx.assetAccessory.deleteMany({ where: { asset_id: assetId } })
    await updateArrivalAssetCoreFields(tx, assetWithId)
    if (asset.coreFunctions.length > 0) {
      await tx.assetAccessory.createMany({
        data: asset.coreFunctions.map(cf => ({ asset_id: assetId, accessory_id: cf.id }))
      })
    }
    await reconcileAssetErrors(tx, assetId, asset.errors ?? [], userId)
    await upsertLatestComment(tx, assetId, asset.comment ?? null, userId)
  })

  await recordAssetUpdate(assetId, {
    model_id: existing.model_id,
    serial_number: existing.serial_number,
    readiness_id: existing.readiness_id,
    country_of_origin_id: existing.country_of_origin_id,
    manufactured_year: existing.manufactured_year,
    meter_black: existing.technical_specification?.meter_black,
    meter_colour: existing.technical_specification?.meter_colour,
    cassettes: existing.technical_specification?.cassettes,
    component_id: existing.technical_specification?.component_id,
    drum_life_c: existing.technical_specification?.drum_life_c,
    drum_life_m: existing.technical_specification?.drum_life_m,
    drum_life_y: existing.technical_specification?.drum_life_y,
    drum_life_k: existing.technical_specification?.drum_life_k,
    toner_life_c: existing.technical_specification?.toner_life_c,
    toner_life_m: existing.technical_specification?.toner_life_m,
    toner_life_y: existing.technical_specification?.toner_life_y,
    toner_life_k: existing.technical_specification?.toner_life_k
  }, {
    model_id: asset.model.id,
    serial_number: asset.serialNumber,
    readiness_id: asset.readiness.id,
    country_of_origin_id: asset.countryOfOrigin?.id ?? null,
    manufactured_year: asset.manufacturedYear,
    meter_black: asset.meterBlack,
    meter_colour: asset.meterColour,
    cassettes: asset.cassettes,
    component_id: asset.componentId,
    drum_life_c: asset.drumLifeC,
    drum_life_m: asset.drumLifeM,
    drum_life_y: asset.drumLifeY,
    drum_life_k: asset.drumLifeK,
    toner_life_c: asset.tonerLifeC,
    toner_life_m: asset.tonerLifeM,
    toner_life_y: asset.tonerLifeY,
    toner_life_k: asset.tonerLifeK
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
  now: Date,
  userId: number
) {
  return tx.asset.create({
    data: {
      ...mapInputAssetToPrismaCreateAsset(asset, barcode, locationId, now, userId),
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
  const brandIdByModelId = await resolveModelBrands([asset.model.id])

  const created = await prisma.$transaction(async (tx) => {
    await validateErrorBrands(tx, buildErrorBrandPairs([asset], brandIdByModelId))
    await validateComponentBrands(tx, buildComponentBrandPairs([asset], brandIdByModelId))
    const locationId = await ensureArrivalLocationId(tx, arrival.destination_id)
    return createArrivalAssetInTx(tx, arrival.id, asset, barcode, locationId, now, userId)
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
