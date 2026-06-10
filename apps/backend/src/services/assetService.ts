import { AssetDetails, AssetError, AssetHistory, AssetHistoryRecord, AssetLocation, AssetLocationDetails, AssetSearchRow, AssetSummary, AssetTransfer, BulkUpdateAssetPricing, Comment, CreateComment, CreatePartTransfer, PartTransfer, ROLE_PERMISSIONS, UpdateAssetErrors, UpdateAssetLocation, UpdateAssetPricing, UpdateAssetSpecs, UpdateError, type AppRole, type ReportVariant } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
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
import { validateComponentBrands } from '../lib/asset-component-validation.js'
import { validateErrorBrands } from '../lib/asset-error-validation.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'
import { generateCsvReport } from './reportService.js'

type LocationRow = {
  warehouse_code: string | null
  warehouse_street: string | null
  zone: string | null
  bin: string | null
}

export function buildLocation(r: LocationRow): AssetLocationDetails | null {
  if (!r.warehouse_code || !r.warehouse_street || !r.zone) return null
  return {
    warehouse_code: r.warehouse_code,
    warehouse_street: r.warehouse_street,
    zone: r.zone,
    bin: r.bin ?? ''
  }
}

type AssetSummaryRow = LocationRow & {
  id: number
  barcode: string
  brand: string
  model: string
  asset_type: string
  serial_number: string
  meter_total: number | null
  status: string
  readiness: string
  hold_number?: string | null
  purchase_invoice_number: string | null
  is_in_transit: boolean
}

export function mapAssetSummary(r: AssetSummaryRow): AssetSummary {
  return {
    id: r.id,
    barcode: r.barcode,
    brand: r.brand,
    model: r.model,
    asset_type: r.asset_type,
    serial_number: r.serial_number,
    meter_total: r.meter_total,
    status: r.status,
    readiness: r.readiness,
    location: buildLocation(r),
    hold_number: r.hold_number ?? null,
    purchase_invoice_number: r.purchase_invoice_number,
    is_in_transit: r.is_in_transit
  }
}

type AssetSearchRowDb = LocationRow & {
  id: number
  barcode: string
  brand: string
  model: string
  asset_type: string
  serial_number: string
  status: string
  readiness: string
  is_in_transit: boolean
  country_of_origin: string | null
  manufactured_year: number | null
  specs_meter_total: number | null
  specs_cassettes: number | null
  specs_internal_finisher: string | null
  specs_toner_life_c: number | null
  specs_toner_life_m: number | null
  specs_toner_life_y: number | null
  specs_toner_life_k: number | null
  cost_purchase_cost: Prisma.Decimal | null
  cost_total_cost: Prisma.Decimal | null
  cost_sale_price: Prisma.Decimal | null
  hold_hold_number: string | null
  held_by: string | null
  hold_created_for: string | null
  hold_customer: string | null
  hold_created_at: Date | null
  vendor: string | null
  customer: string | null
  departed_at: Date | null
  arrival_created_at: Date | null
  purchase_invoice_invoice_number: string | null
  latest_comment: string | null
  latest_comment_by: string | null
  latest_comment_at: Date | null
}

function decimalToNumber(d: Prisma.Decimal | null): number | null {
  return d === null ? null : d.toNumber()
}

function mapAssetSearchRow(r: AssetSearchRowDb): AssetSearchRow {
  return {
    id: r.id,
    barcode: r.barcode,
    brand: r.brand,
    model: r.model,
    asset_type: r.asset_type,
    serial_number: r.serial_number,
    status: r.status,
    readiness: r.readiness,
    location: buildLocation(r),
    is_in_transit: r.is_in_transit,
    country_of_origin: r.country_of_origin,
    manufactured_year: r.manufactured_year,
    specs_meter_total: r.specs_meter_total,
    specs_cassettes: r.specs_cassettes,
    specs_internal_finisher: r.specs_internal_finisher,
    specs_toner_life_c: r.specs_toner_life_c,
    specs_toner_life_m: r.specs_toner_life_m,
    specs_toner_life_y: r.specs_toner_life_y,
    specs_toner_life_k: r.specs_toner_life_k,
    cost_purchase_cost: decimalToNumber(r.cost_purchase_cost),
    cost_total_cost: decimalToNumber(r.cost_total_cost),
    cost_sale_price: decimalToNumber(r.cost_sale_price),
    hold_hold_number: r.hold_hold_number,
    held_by: r.held_by,
    hold_created_for: r.hold_created_for,
    hold_customer: r.hold_customer,
    hold_created_at: r.hold_created_at,
    vendor: r.vendor,
    customer: r.customer,
    departed_at: r.departed_at,
    arrival_created_at: r.arrival_created_at,
    purchase_invoice_invoice_number: r.purchase_invoice_invoice_number,
    latest_comment: r.latest_comment,
    latest_comment_by: r.latest_comment_by,
    latest_comment_at: r.latest_comment_at,
  }
}

function redactSearchRowCost(
  row: AssetSearchRow,
  role: AppRole | null,
): AssetSearchRow {
  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const canViewPurchase = permissions.includes('view_purchase_price')
  const canViewSale = permissions.includes('view_sale_price')
  return {
    ...row,
    cost_purchase_cost: canViewPurchase ? row.cost_purchase_cost : null,
    cost_total_cost: canViewPurchase ? row.cost_total_cost : null,
    cost_sale_price: canViewSale ? row.cost_sale_price : null,
  }
}

export async function getAssets(
  model: string,
  statusIds: number[],
  readinessIds: number[],
  warehouseIds: number[],
  meterMinParam: number,
  meterMaxParam: number,
  cassettesParam: number,
  componentIdParam: number,
  brandIds: number[],
  assetTypeIds: number[],
  role: AppRole | null,
): Promise<AssetSearchRow[]> {
  const rows = await prisma.$queryRawTyped(
    getAssetsQuery(
      model,
      statusIds,
      readinessIds,
      warehouseIds,
      meterMinParam,
      meterMaxParam,
      cassettesParam,
      componentIdParam,
      brandIds,
      assetTypeIds,
    )
  )
  return rows.map(mapAssetSearchRow).map(r => redactSearchRowCost(r, role))
}

const IN_STOCK_STATUS = 'IN_STOCK'
const HELD_STATUS = 'HELD'

export async function getStockReportAssets(
  warehouseIds: number[],
  brandIds: number[],
  assetTypeIds: number[],
  readinessIds: number[],
  model: string,
  meterMinParam: number,
  meterMaxParam: number,
  includeHeld: boolean,
  role: AppRole | null,
): Promise<AssetSearchRow[]> {
  const wantedStatuses = includeHeld ? [IN_STOCK_STATUS, HELD_STATUS] : [IN_STOCK_STATUS]
  const statuses = await prisma.status.findMany({
    where: { status: { in: wantedStatuses } },
    select: { id: true },
  })
  return getAssets(
    model,
    statuses.map(s => s.id),
    readinessIds,
    warehouseIds,
    meterMinParam,
    meterMaxParam,
    -1,
    -1,
    brandIds,
    assetTypeIds,
    role,
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

type AssetDetailRow = getAssetDetailsBatchQuery.Result

function mapAssetDetail(r: AssetDetailRow): AssetDetails {
  return {
    id: r.id,
    barcode: r.barcode,
    serial_number: r.serial_number,
    model: r.model,
    is_colour: r.is_colour,
    brand: r.brand,
    asset_type: r.asset_type,
    status: r.status,
    readiness: r.readiness,
    is_in_transit: r.is_in_transit,
    country_of_origin: r.country_of_origin,
    manufactured_year: r.manufactured_year,
    location: buildLocation(r),
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
      meter_total: r.meter_total,
      drum_life_c: r.drum_life_c,
      drum_life_m: r.drum_life_m,
      drum_life_y: r.drum_life_y,
      drum_life_k: r.drum_life_k,
      toner_life_c: r.toner_life_c,
      toner_life_m: r.toner_life_m,
      toner_life_y: r.toner_life_y,
      toner_life_k: r.toner_life_k,
    },
    created_at: r.created_at,
    hold: mapHold(r),
    arrival: mapArrival(r),
    departure: mapDeparture(r),
    purchase_invoice: mapInvoice(r)
  }
}

function mapHold(r: AssetDetailRow) {
  if (!r.hold_number) return null
  return {
    created_by: r.hold_by_name!,
    created_for: r.hold_for_name!,
    created_at: r.hold_created_at,
    customer: r.hold_customer!,
    from_dt: r.hold_from,
    to_dt: r.hold_to,
    notes: r.hold_notes,
    hold_number: r.hold_number
  }
}

function mapArrival(r: AssetDetailRow) {
  if (!r.arrival_number) return null
  return {
    arrival_number: r.arrival_number,
    origin: r.arrival_origin!,
    destination_code: r.arrival_destination_city_code!,
    destination_street: r.arrival_destination_street!,
    transporter: r.arrival_transporter!,
    created_by: r.arrival_created_by_name!,
    notes: r.arrival_notes,
    created_at: r.arrival_created_at!
  }
}

function mapDeparture(r: AssetDetailRow) {
  if (!r.departure_number) return null
  return {
    departure_number: r.departure_number,
    origin_code: r.departure_origin_city_code!,
    origin_street: r.departure_origin_street!,
    destination: r.departure_destination!,
    transporter: r.departure_transporter!,
    created_by: r.departure_created_by_name ?? '',
    notes: r.departure_notes,
    created_at: r.departure_created_at!
  }
}

function mapInvoice(r: AssetDetailRow) {
  if (!r.purchase_invoice_number) return null
  return {
    invoice_number: r.purchase_invoice_number,
    is_cleared: r.purchase_invoice_is_cleared!
  }
}

export async function exportAssetReport(
  barcodes: string[],
  role: AppRole | null,
  variant: ReportVariant
): Promise<string> {
  const results = await prisma.$queryRawTyped(getAssetDetailsBatchQuery(barcodes))
  const details = results.map(r => mapAssetDetail(r))
  return generateCsvReport(variant, details, role)
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

/**
 * Diff the asset's current AssetError rows against the desired `next` set, then
 * delete/create/update accordingly. Caller is responsible for having already
 * verified the error ids via validateErrorIdsForBrand. Returns the sorted
 * id lists for history recording.
 */
export async function reconcileAssetErrors(
  tx: Prisma.TransactionClient,
  assetId: number,
  next: UpdateError[],
  userId: number,
  now: Date = new Date()
): Promise<{ prevErrorIds: number[]; nextErrorIds: number[] }> {
  const currentRows = await tx.assetError.findMany({
    where: { asset_id: assetId },
    select: { error_id: true, is_fixed: true }
  })
  const currentIdMap = new Map(currentRows.map(ae => [ae.error_id, ae.is_fixed]))
  const inputIdMap = new Map(next.map(e => [e.error_id, e.is_fixed]))

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
    prevErrorIds: currentRows.map(r => r.error_id).sort(),
    nextErrorIds: [...inputIdMap.keys()].sort()
  }
}

/**
 * Upsert against the asset's latest comment row:
 *  - empty/null text → delete the latest row (if any)
 *  - non-empty text + latest exists → update text + updated_at
 *  - non-empty text + no rows → insert
 */
export async function upsertLatestComment(
  tx: Prisma.TransactionClient,
  assetId: number,
  text: string | null,
  userId: number,
  now: Date = new Date()
): Promise<void> {
  const latest = await tx.comment.findFirst({
    where: { asset_id: assetId },
    orderBy: { created_at: 'desc' },
    select: { id: true, comment: true }
  })

  const trimmed = text?.trim() ?? ''
  if (trimmed === '') {
    if (latest) await tx.comment.delete({ where: { id: latest.id } })
    return
  }

  if (latest) {
    if (latest.comment === trimmed) return
    await tx.comment.update({
      where: { id: latest.id },
      data: { comment: trimmed, updated_at: now }
    })
    return
  }

  await tx.comment.create({
    data: {
      asset_id: assetId,
      created_by_id: userId,
      comment: trimmed,
      created_at: now,
      updated_at: now
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

    await validateErrorBrands(
      tx,
      data.errors.map(e => ({ errorId: e.error_id, expectedBrandId: asset.model.brand_id }))
    )
    const { prevErrorIds, nextErrorIds } = await reconcileAssetErrors(
      tx, asset.id, data.errors, userId
    )
    return { assetId: asset.id, prevErrorIds, nextErrorIds }
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

const BIN_ZONE = 'BIN'

export async function getLocationsByWarehouse(warehouseId: number): Promise<AssetLocation[]> {
  return prisma.$queryRawTyped(getLocationsByWarehouseQuery(warehouseId))
}

export async function updateAssetLocation(
  barcode: string,
  data: UpdateAssetLocation,
  userId: number
): Promise<void> {
  const { assetId, beforeLocationId, afterLocationId } = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { barcode }, select: { id: true, location_id: true }
    })
    if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

    const zone = await tx.zone.findUnique({ where: { id: data.zone_id }, select: { zone: true } })
    if (!zone) throw new NotFoundError('Zone not found')

    const warehouse = await tx.warehouse.findUnique({
      where: { id: data.warehouse_id }, select: { id: true }
    })
    if (!warehouse) throw new NotFoundError('Warehouse not found')

    const bin = zone.zone === BIN_ZONE ? data.bin : ''

    const location = await tx.location.upsert({
      where: {
        warehouse_id_zone_id_bin: {
          warehouse_id: data.warehouse_id,
          zone_id: data.zone_id,
          bin
        }
      },
      create: { warehouse_id: data.warehouse_id, zone_id: data.zone_id, bin },
      update: {}
    })

    await tx.asset.update({ where: { barcode }, data: { location_id: location.id } })

    return { assetId: asset.id, beforeLocationId: asset.location_id, afterLocationId: location.id }
  })

  await recordAssetUpdate(assetId, { location_id: beforeLocationId }, { location_id: afterLocationId }, userId)
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
      readiness_id: true,
      country_of_origin_id: true,
      manufactured_year: true,
      model: { select: { brand_id: true } },
      technical_specification: {
        select: {
          cassettes: true, component_id: true, meter_black: true, meter_colour: true,
          meter_total: true, drum_life_c: true, drum_life_m: true, drum_life_y: true, drum_life_k: true,
          toner_life_c: true, toner_life_m: true, toner_life_y: true, toner_life_k: true
        }
      }
    }
  })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  if (data.component_id !== null) {
    await validateComponentBrands(
      prisma,
      [{ componentId: data.component_id, expectedBrandId: asset.model.brand_id }]
    )
  }

  const meter_total = (data.meter_black ?? 0) + (data.meter_colour ?? 0)

  const accessories = await prisma.accessory.findMany({
    where: { accessory: { in: data.accessory_names } },
    select: { id: true },
  })

  await prisma.$transaction([
    prisma.asset.update({
      where: { id: asset.id },
      data: {
        readiness_id: data.readiness_id,
        country_of_origin_id: data.country_of_origin_id,
        manufactured_year: data.manufactured_year,
      }
    }),
    prisma.technicalSpecification.upsert({
      where: { asset_id: asset.id },
      update: {
        cassettes: data.cassettes, component_id: data.component_id,
        meter_black: data.meter_black, meter_colour: data.meter_colour, meter_total,
        drum_life_c: data.drum_life_c, drum_life_m: data.drum_life_m,
        drum_life_y: data.drum_life_y, drum_life_k: data.drum_life_k,
        toner_life_c: data.toner_life_c, toner_life_m: data.toner_life_m,
        toner_life_y: data.toner_life_y, toner_life_k: data.toner_life_k
      },
      create: {
        asset_id: asset.id, cassettes: data.cassettes, component_id: data.component_id,
        meter_black: data.meter_black, meter_colour: data.meter_colour, meter_total,
        drum_life_c: data.drum_life_c, drum_life_m: data.drum_life_m,
        drum_life_y: data.drum_life_y, drum_life_k: data.drum_life_k,
        toner_life_c: data.toner_life_c, toner_life_m: data.toner_life_m,
        toner_life_y: data.toner_life_y, toner_life_k: data.toner_life_k
      },
    }),
    prisma.assetAccessory.deleteMany({ where: { asset_id: asset.id } }),
    ...accessories.map(a => prisma.assetAccessory.create({ data: { asset_id: asset.id, accessory_id: a.id } })),
  ])

  await recordAssetUpdate(asset.id, {
    readiness_id: asset.readiness_id,
    country_of_origin_id: asset.country_of_origin_id,
    manufactured_year: asset.manufactured_year,
    cassettes: asset.technical_specification?.cassettes,
    component_id: asset.technical_specification?.component_id,
    meter_black: asset.technical_specification?.meter_black,
    meter_colour: asset.technical_specification?.meter_colour,
    meter_total: asset.technical_specification?.meter_total,
    drum_life_c: asset.technical_specification?.drum_life_c,
    drum_life_m: asset.technical_specification?.drum_life_m,
    drum_life_y: asset.technical_specification?.drum_life_y,
    drum_life_k: asset.technical_specification?.drum_life_k,
    toner_life_c: asset.technical_specification?.toner_life_c,
    toner_life_m: asset.technical_specification?.toner_life_m,
    toner_life_y: asset.technical_specification?.toner_life_y,
    toner_life_k: asset.technical_specification?.toner_life_k
  }, {
    readiness_id: data.readiness_id,
    country_of_origin_id: data.country_of_origin_id,
    manufactured_year: data.manufactured_year,
    cassettes: data.cassettes, component_id: data.component_id,
    meter_black: data.meter_black, meter_colour: data.meter_colour, meter_total,
    drum_life_c: data.drum_life_c, drum_life_m: data.drum_life_m,
    drum_life_y: data.drum_life_y, drum_life_k: data.drum_life_k,
    toner_life_c: data.toner_life_c, toner_life_m: data.toner_life_m,
    toner_life_y: data.toner_life_y, toner_life_k: data.toner_life_k
  }, userId)
}
