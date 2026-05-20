import { AssetDetails, AssetError, AssetHistory, AssetHistoryRecord, AssetLocation, AssetSummary, AssetTransfer, BulkUpdateAssetPricing, Comment, CreateComment, CreatePartTransfer, PartTransfer, ROLE_PERMISSIONS, UpdateAssetErrors, UpdateAssetLocation, UpdateAssetPricing, UpdateAssetSpecs, type AppRole } from 'shared-types'
import {
  getAssetAccessories as getAssetAccessoriesQuery,
  getAssetComments as getAssetCommentsQuery,
  getAssetDetailsBatch as getAssetDetailsBatchQuery,
  getAssetDetails as getAssetDetailsQuery,
  getAssetErrors as getAssetErrorsQuery,
  getAssetPartTransfer as getAssetPartTransferQuery,
  getAssets as getAssetsQuery,
  getAssetTransfers as getAssetTransfersQuery,
  getLocationsByWarehouse as getLocationsByWarehouseQuery
} from '../../generated/prisma/sql.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

export async function getAssets(
  model: string,
  availabilityStatusIds: number[],
  technicalStatusIds: number[],
  warehouseIds: number[],
  meterParam: number
): Promise<AssetSummary[]> {
  return prisma.$queryRawTyped(
    getAssetsQuery(model, availabilityStatusIds, technicalStatusIds, warehouseIds, meterParam)
  )
}

export async function getAssetDetail(
  barcode: string,
  role: AppRole | null
): Promise<AssetDetails> {
  const assets = await prisma.$queryRawTyped(getAssetDetailsQuery(barcode))
  if (!assets || assets.length === 0) throw new NotFoundError(`Asset ${barcode} not found`)
  return redactCost(mapAssetDetail(assets[0]), role)
}

function redactCost(detail: AssetDetails, role: AppRole | null): AssetDetails {
  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const canViewSale = permissions.includes('view_sale_price')
  const canViewPurchase = permissions.includes('view_purchase_price')
  return {
    ...detail,
    cost: {
      purchase_cost: canViewPurchase ? detail.cost.purchase_cost : null,
      transport_cost: canViewPurchase ? detail.cost.transport_cost : null,
      processing_cost: canViewPurchase ? detail.cost.processing_cost : null,
      other_cost: canViewPurchase ? detail.cost.other_cost : null,
      parts_cost: canViewPurchase ? detail.cost.parts_cost : null,
      total_cost: canViewPurchase ? detail.cost.total_cost : null,
      sale_price: canViewSale ? detail.cost.sale_price : null
    }
  }
}

export async function getAccessories(barcode: string): Promise<string[]> {
  const accessories = await prisma.$queryRawTyped(getAssetAccessoriesQuery(barcode))
  return accessories.map(a => a.accessory)
}

export async function getErrors(barcode: string): Promise<AssetError[]> {
  return prisma.$queryRawTyped(getAssetErrorsQuery(barcode))
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase()
}

export async function getComments(barcode: string): Promise<Comment[]> {
  const comments = await prisma.$queryRawTyped(getAssetCommentsQuery(barcode))
  return comments.map(c => ({ ...c, initials: getInitials(c.username) }))
}

export async function getAssetPartTransfer(barcode: string): Promise<PartTransfer[]> {
  return prisma.$queryRawTyped(getAssetPartTransferQuery(barcode))
}

export async function getTransfers(barcode: string): Promise<AssetTransfer[]> {
  return prisma.$queryRawTyped(getAssetTransfersQuery(barcode))
}

function mapAssetDetail(r: getAssetDetailsQuery.Result): AssetDetails {
  return {
    id: r.id,
    barcode: r.barcode,
    serial_number: r.serial_number,
    model: r.model,
    brand: r.brand,
    asset_type: r.asset_type,
    availability_status: r.availability_status,
    technical_status: r.technical_status,
    location: r.location,
    warehouse_code: r.location_city_code,
    warehouse_street: r.location_street,
    cost: {
      purchase_cost: r.purchase_cost?.toNumber() ?? null,
      transport_cost: r.transport_cost?.toNumber() ?? null,
      processing_cost: r.processing_cost?.toNumber() ?? null,
      other_cost: r.other_cost?.toNumber() ?? null,
      parts_cost: r.parts_cost?.toNumber() ?? null,
      total_cost: r.total_cost?.toNumber() ?? null,
      sale_price: r.sale_price?.toNumber() ?? null
    },
    specs: {
      cassettes: r.ts_cassettes,
      internal_finisher: r.internal_finisher,
      meter_black: r.meter_black,
      meter_colour: r.meter_colour,
      meter_total: r.meter_black && r.meter_colour ? r.meter_black + r.meter_colour : 0,
      drum_life_c: r.drum_life_c,
      drum_life_m: r.drum_life_m,
      drum_life_y: r.drum_life_y,
      drum_life_k: r.drum_life_k,
    },
    created_at: r.created_at,
    hold: mapHold(r),
    arrival: mapArrival(r),
    departure: mapDeparture(r),
    purchase_invoice: mapInvoice(r)
  }
}

function mapHold(r: getAssetDetailsQuery.Result) {
  if (!r.hold_number) return null
  return {
    created_by: r.hold_by_name,
    created_for: r.hold_for_name,
    created_at: r.hold_created_at,
    customer: r.hold_customer,
    from_dt: r.hold_from,
    to_dt: r.hold_to,
    notes: r.hold_notes,
    hold_number: r.hold_number
  }
}

function mapArrival(r: getAssetDetailsQuery.Result) {
  if (!r.arrival_number) return null
  return {
    arrival_number: r.arrival_number,
    origin: r.arrival_origin,
    destination_code: r.arrival_destination_city_code,
    destination_street: r.arrival_destination_street,
    transporter: r.arrival_transporter,
    created_by: r.arrival_created_by_name,
    notes: r.arrival_notes,
    created_at: r.arrival_created_at
  }
}

function mapDeparture(r: getAssetDetailsQuery.Result) {
  if (!r.departure_number) return null
  return {
    departure_number: r.departure_number,
    origin_code: r.departure_origin_city_code,
    origin_street: r.departure_origin_street,
    destination: r.departure_destination,
    transporter: r.departure_transporter,
    created_by: r.departure_created_by_name,
    notes: r.departure_notes,
    created_at: r.departure_created_at
  }
}

function mapInvoice(r: getAssetDetailsQuery.Result) {
  if (!r.purchase_invoice_number) return null
  return {
    invoice_number: r.purchase_invoice_number,
    is_cleared: r.purchase_invoice_is_cleared
  }
}

export async function exportAssets(
  barcodes: string[],
  role: AppRole | null
): Promise<string> {
  const results = await prisma.$queryRawTyped(getAssetDetailsBatchQuery(barcodes))
  const details = results.map(r => redactCost(
    mapAssetDetail(r as unknown as getAssetDetailsQuery.Result),
    role
  ))
  return generateCsv(details)
}

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = val instanceof Date ? val.toISOString() : String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const CSV_HEADERS = [
  'barcode', 'serial_number', 'model', 'brand', 'asset_type',
  'availability_status', 'technical_status',
  'location', 'warehouse_code', 'warehouse_street', 'created_at',
  'cost_purchase_cost', 'cost_transport_cost', 'cost_processing_cost',
  'cost_other_cost', 'cost_parts_cost', 'cost_total_cost', 'cost_sale_price',
  'specs_cassettes', 'specs_internal_finisher', 'specs_meter_black',
  'specs_meter_colour', 'specs_meter_total', 'specs_drum_life_c',
  'specs_drum_life_m', 'specs_drum_life_y', 'specs_drum_life_k',
  'hold_created_by', 'hold_created_for', 'hold_created_at', 'hold_customer',
  'hold_from_dt', 'hold_to_dt', 'hold_notes', 'hold_hold_number',
  'arrival_arrival_number', 'arrival_origin', 'arrival_destination_code',
  'arrival_destination_street', 'arrival_transporter', 'arrival_created_by',
  'arrival_notes', 'arrival_created_at', 'departure_departure_number',
  'departure_origin_code', 'departure_origin_street', 'departure_destination',
  'departure_transporter', 'departure_created_by', 'departure_notes',
  'departure_created_at', 'purchase_invoice_invoice_number', 'purchase_invoice_is_cleared',
]

function generateCsv(assets: AssetDetails[]): string {
  const rows = assets.map(a => [
    a.barcode, a.serial_number, a.model, a.brand, a.asset_type,
    a.availability_status, a.technical_status,
    a.location, a.warehouse_code, a.warehouse_street, a.created_at,
    a.cost.purchase_cost, a.cost.transport_cost, a.cost.processing_cost,
    a.cost.other_cost, a.cost.parts_cost, a.cost.total_cost, a.cost.sale_price,
    a.specs.cassettes, a.specs.internal_finisher, a.specs.meter_black,
    a.specs.meter_colour, a.specs.meter_total, a.specs.drum_life_c,
    a.specs.drum_life_m, a.specs.drum_life_y, a.specs.drum_life_k,
    a.hold?.created_by, a.hold?.created_for, a.hold?.created_at,
    a.hold?.customer, a.hold?.from_dt, a.hold?.to_dt,
    a.hold?.notes, a.hold?.hold_number,
    a.arrival?.arrival_number, a.arrival?.origin, a.arrival?.destination_code,
    a.arrival?.destination_street, a.arrival?.transporter, a.arrival?.created_by,
    a.arrival?.notes, a.arrival?.created_at, a.departure?.departure_number,
    a.departure?.origin_code, a.departure?.origin_street, a.departure?.destination,
    a.departure?.transporter, a.departure?.created_by, a.departure?.notes,
    a.departure?.created_at, a.purchase_invoice?.invoice_number,
    a.purchase_invoice?.is_cleared,
  ].map(escapeCSV))
  return [CSV_HEADERS.join(','), ...rows.map(r => r.join(','))].join('\n')
}

export async function createComment(barcode: string, data: CreateComment, userId: number): Promise<void> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)
  const now = new Date()
  await prisma.comment.create({
    data: {
      asset_id: asset.id,
      created_by_id: userId,
      comment: data.comment,
      created_at: now,
      updated_at: now
    }
  })
}

export async function createPartTransfer(
  recipientBarcode: string,
  data: CreatePartTransfer,
  userId: number
): Promise<void> {
  if (data.donor_barcode === recipientBarcode) {
    throw new ValidationError('Donor and recipient cannot be the same asset')
  }
  const recipient = await prisma.asset.findUnique({
    where: { barcode: recipientBarcode },
    select: { id: true }
  })
  if (!recipient) throw new NotFoundError(`Asset ${recipientBarcode} not found`)

  const donor = await prisma.asset.findUnique({
    where: { barcode: data.donor_barcode },
    select: { id: true }
  })
  if (!donor) throw new NotFoundError(`Donor asset ${data.donor_barcode} not found`)

  await prisma.partTransfer.create({
    data: {
      recipient_asset_id: recipient.id,
      donor_asset_id: donor.id,
      part: data.part,
      is_exchange: data.is_exchange,
      notes: data.notes,
      fixed_at: new Date(),
      fixed_by: userId
    }
  })
}

export async function updateAssetErrors(
  barcode: string,
  data: UpdateAssetErrors,
  userId: number
): Promise<void> {
  const { assetId, prevErrorIds, nextErrorIds } = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { barcode },
      select: { id: true, model: { select: { brand_id: true } } }
    })
    if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

    const assetId = asset.id
    const brandId = asset.model.brand_id

    const errorRecords = await tx.error.findMany({
      where: { brand_id: brandId, code: { in: data.errors.map(e => e.code) } },
      select: { id: true, code: true }
    })
    const codeToId = new Map(errorRecords.map(e => [e.code, e.id]))

    const currentRows = await tx.assetError.findMany({
      where: { asset_id: assetId },
      select: { error_id: true, is_fixed: true }
    })
    const currentIdMap = new Map(currentRows.map(ae => [ae.error_id, ae.is_fixed]))

    const inputIdMap = new Map(
      data.errors
        .filter(e => codeToId.has(e.code))
        .map(e => [codeToId.get(e.code)!, e.is_fixed])
    )

    const now = new Date()

    const errorIdsToDelete = currentRows
      .filter(ae => !inputIdMap.has(ae.error_id))
      .map(ae => ae.error_id)
    if (errorIdsToDelete.length > 0) {
      await tx.assetError.deleteMany({
        where: { asset_id: assetId, error_id: { in: errorIdsToDelete } }
      })
    }

    const rowsToCreate = [...inputIdMap.entries()]
      .filter(([errorId]) => !currentIdMap.has(errorId))
      .map(([errorId, is_fixed]) => ({
        asset_id: assetId,
        error_id: errorId,
        is_fixed,
        added_by: userId,
        added_at: now,
        fixed_at: is_fixed ? now : null,
        fixed_by: is_fixed ? userId : null
      }))
    if (rowsToCreate.length > 0) {
      await tx.assetError.createMany({ data: rowsToCreate })
    }

    for (const [errorId, is_fixed] of inputIdMap.entries()) {
      if (currentIdMap.has(errorId) && currentIdMap.get(errorId) !== is_fixed) {
        await tx.assetError.update({
          where: { asset_id_error_id: { asset_id: assetId, error_id: errorId } },
          data: {
            is_fixed,
            fixed_at: is_fixed ? now : null,
            fixed_by: is_fixed ? userId : null
          }
        })
      }
    }

    return {
      assetId,
      prevErrorIds: currentRows.map(r => r.error_id).sort(),
      nextErrorIds: [...inputIdMap.keys()].sort()
    }
  })

  await recordAssetUpdate(assetId, { error_ids: prevErrorIds }, { error_ids: nextErrorIds }, userId)
}

export async function updateAssetPricing(
  barcode: string,
  data: UpdateAssetPricing,
  userId: number
): Promise<void> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const currentCost = await prisma.cost.findUnique({
    where: { asset_id: asset.id },
    select: {
      purchase_cost: true, transport_cost: true, processing_cost: true,
      other_cost: true, parts_cost: true, total_cost: true, sale_price: true
    }
  })

  const total_cost = data.purchase_cost + data.transport_cost + data.processing_cost
    + data.other_cost + data.parts_cost

  await prisma.cost.upsert({
    where: { asset_id: asset.id },
    update: {
      purchase_cost: data.purchase_cost, transport_cost: data.transport_cost,
      processing_cost: data.processing_cost, other_cost: data.other_cost,
      parts_cost: data.parts_cost, total_cost, sale_price: data.sale_price
    },
    create: {
      asset_id: asset.id, purchase_cost: data.purchase_cost,
      transport_cost: data.transport_cost, processing_cost: data.processing_cost,
      other_cost: data.other_cost, parts_cost: data.parts_cost,
      total_cost, sale_price: data.sale_price
    },
  })

  await recordAssetUpdate(asset.id, {
    purchase_cost: currentCost?.purchase_cost?.toNumber() ?? null,
    transport_cost: currentCost?.transport_cost?.toNumber() ?? null,
    processing_cost: currentCost?.processing_cost?.toNumber() ?? null,
    other_cost: currentCost?.other_cost?.toNumber() ?? null,
    parts_cost: currentCost?.parts_cost?.toNumber() ?? null,
    total_cost: currentCost?.total_cost?.toNumber() ?? null,
    sale_price: currentCost?.sale_price?.toNumber() ?? null
  }, {
    purchase_cost: data.purchase_cost, transport_cost: data.transport_cost,
    processing_cost: data.processing_cost, other_cost: data.other_cost,
    parts_cost: data.parts_cost, total_cost, sale_price: data.sale_price
  }, userId)
}

export async function bulkUpdateAssetPricing(
  items: BulkUpdateAssetPricing['items'],
  userId: number
): Promise<void> {
  const assets = await prisma.asset.findMany({
    where: { barcode: { in: items.map(i => i.barcode) } },
    select: { id: true, barcode: true }
  })
  if (assets.length !== items.length) {
    const found = new Set(assets.map(a => a.barcode))
    const missing = items.map(i => i.barcode).filter(b => !found.has(b))
    throw new NotFoundError(`Assets not found: ${missing.join(', ')}`)
  }
  const assetMap = new Map(assets.map(a => [a.barcode, a.id]))

  const currentCosts = await prisma.cost.findMany({
    where: { asset_id: { in: assets.map(a => a.id) } },
    select: {
      asset_id: true, purchase_cost: true, transport_cost: true,
      processing_cost: true, other_cost: true, parts_cost: true,
      total_cost: true, sale_price: true
    }
  })
  const costMap = new Map(currentCosts.map(c => [c.asset_id, c]))

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const assetId = assetMap.get(item.barcode)!
      const total_cost = item.purchase_cost + item.transport_cost + item.processing_cost
        + item.other_cost + item.parts_cost
      await tx.cost.upsert({
        where: { asset_id: assetId },
        update: {
          purchase_cost: item.purchase_cost, transport_cost: item.transport_cost,
          processing_cost: item.processing_cost, other_cost: item.other_cost,
          parts_cost: item.parts_cost, total_cost, sale_price: item.sale_price
        },
        create: {
          asset_id: assetId, purchase_cost: item.purchase_cost,
          transport_cost: item.transport_cost, processing_cost: item.processing_cost,
          other_cost: item.other_cost, parts_cost: item.parts_cost,
          total_cost, sale_price: item.sale_price
        }
      })
    }
  })

  await Promise.all(items.map(item => {
    const assetId = assetMap.get(item.barcode)!
    const currentCost = costMap.get(assetId)
    const total_cost = item.purchase_cost + item.transport_cost + item.processing_cost
      + item.other_cost + item.parts_cost
    return recordAssetUpdate(assetId, {
      purchase_cost: currentCost?.purchase_cost?.toNumber() ?? null,
      transport_cost: currentCost?.transport_cost?.toNumber() ?? null,
      processing_cost: currentCost?.processing_cost?.toNumber() ?? null,
      other_cost: currentCost?.other_cost?.toNumber() ?? null,
      parts_cost: currentCost?.parts_cost?.toNumber() ?? null,
      total_cost: currentCost?.total_cost?.toNumber() ?? null,
      sale_price: currentCost?.sale_price?.toNumber() ?? null
    }, {
      purchase_cost: item.purchase_cost, transport_cost: item.transport_cost,
      processing_cost: item.processing_cost, other_cost: item.other_cost,
      parts_cost: item.parts_cost, total_cost, sale_price: item.sale_price
    }, userId)
  }))
}

export async function getLocationsByWarehouse(warehouseId: number): Promise<AssetLocation[]> {
  return prisma.$queryRawTyped(getLocationsByWarehouseQuery(warehouseId))
}

export async function updateAssetLocation(
  barcode: string,
  data: UpdateAssetLocation,
  userId: number
): Promise<void> {
  const asset = await prisma.asset.findUnique({
    where: { barcode }, select: { id: true, location_id: true }
  })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const location = await prisma.location.findUnique({ where: { id: data.location_id } })
  if (!location) throw new NotFoundError('Location not found')

  await prisma.asset.update({ where: { barcode }, data: { location_id: data.location_id } })
  await recordAssetUpdate(asset.id, { location_id: asset.location_id }, { location_id: data.location_id }, userId)
}

export async function getAssetHistory(
  barcode: string,
  role: AppRole | null
): Promise<AssetHistory> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const entityTypes: string[] = ['Asset']
  if (permissions.includes('view_purchase_price')) entityTypes.push('AssetPurchaseCost')
  if (permissions.includes('view_sale_price')) entityTypes.push('AssetSalePrice')

  const rows = await prisma.history.findMany({
    where: { entity_type: { in: entityTypes }, entity_id: asset.id },
    include: { User: { select: { name: true } } },
    orderBy: { changed_on: 'desc' }
  })

  return rows.map(row => ({
    action_type: row.action_type as 'CREATE' | 'UPDATE',
    user_name: row.User.name,
    changed_on: row.changed_on,
    changes: row.changes as AssetHistoryRecord['changes']
  }) as AssetHistoryRecord)
}

export async function updateAssetSpecs(
  barcode: string,
  data: UpdateAssetSpecs,
  userId: number
): Promise<void> {
  const asset = await prisma.asset.findUnique({
    where: { barcode },
    select: {
      id: true,
      technical_specification: {
        select: {
          cassettes: true, internal_finisher: true, meter_black: true, meter_colour: true,
          meter_total: true, drum_life_c: true, drum_life_m: true, drum_life_y: true, drum_life_k: true
        }
      }
    }
  })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const meter_total = (data.meter_black ?? 0) + (data.meter_colour ?? 0)

  const accessories = await prisma.accessory.findMany({
    where: { accessory: { in: data.accessory_names } },
    select: { id: true },
  })

  await prisma.$transaction([
    prisma.technicalSpecification.upsert({
      where: { asset_id: asset.id },
      update: {
        cassettes: data.cassettes, internal_finisher: data.internal_finisher,
        meter_black: data.meter_black, meter_colour: data.meter_colour, meter_total,
        drum_life_c: data.drum_life_c, drum_life_m: data.drum_life_m,
        drum_life_y: data.drum_life_y, drum_life_k: data.drum_life_k
      },
      create: {
        asset_id: asset.id, cassettes: data.cassettes, internal_finisher: data.internal_finisher,
        meter_black: data.meter_black, meter_colour: data.meter_colour, meter_total,
        drum_life_c: data.drum_life_c, drum_life_m: data.drum_life_m,
        drum_life_y: data.drum_life_y, drum_life_k: data.drum_life_k
      },
    }),
    prisma.assetAccessory.deleteMany({ where: { asset_id: asset.id } }),
    ...accessories.map(a => prisma.assetAccessory.create({ data: { asset_id: asset.id, accessory_id: a.id } })),
  ])

  await recordAssetUpdate(asset.id, {
    cassettes: asset.technical_specification?.cassettes,
    internal_finisher: asset.technical_specification?.internal_finisher,
    meter_black: asset.technical_specification?.meter_black,
    meter_colour: asset.technical_specification?.meter_colour,
    meter_total: asset.technical_specification?.meter_total,
    drum_life_c: asset.technical_specification?.drum_life_c,
    drum_life_m: asset.technical_specification?.drum_life_m,
    drum_life_y: asset.technical_specification?.drum_life_y,
    drum_life_k: asset.technical_specification?.drum_life_k
  }, {
    cassettes: data.cassettes, internal_finisher: data.internal_finisher,
    meter_black: data.meter_black, meter_colour: data.meter_colour, meter_total,
    drum_life_c: data.drum_life_c, drum_life_m: data.drum_life_m,
    drum_life_y: data.drum_life_y, drum_life_k: data.drum_life_k
  }, userId)
}
