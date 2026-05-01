import { ApiResponse, AssetDetails, AssetError, AssetTransfer, Comment, CreateComment, CreatePartTransfer, PartTransfer, response400, response500, successResponse, UpdateAssetErrors, UpdateAssetPricing } from 'shared-types'
import {
  getAssetAccessories as getAssetAccessoriesQuery,
  getAssetComments as getAssetCommentsQuery,
  getAssetDetails as getAssetDetailsQuery,
  getAssetErrors as getAssetErrorsQuery,
  getAssetPartTransfer as getAssetPartTransferQuery,
  getAssetTransfers as getAssetTransfersQuery
} from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'


export async function getAssetDetail(barcode: string): Promise<ApiResponse<AssetDetails>> {
  try {
    const assets = await prisma.$queryRawTyped(getAssetDetailsQuery(barcode))
    if (!assets || assets.length === 0) {
      return response400(`Asset ${barcode} not found`)
    }
    return successResponse(mapAssetDetail(assets[0]))
  } catch (error) {
    return response500(`Failed to fetch asset ${barcode}`)
  }
}

export async function getAccessories(barcode: string): Promise<ApiResponse<string[]>> {
  try {
    const accessories = await prisma.$queryRawTyped(getAssetAccessoriesQuery(barcode))
    return successResponse(accessories.map(a => a.accessory))
  } catch (error) {
    return response500(`Failed to fetch accessories for ${barcode}`)
  }
}

export async function getErrors(barcode: string): Promise<ApiResponse<AssetError[]>> {
  try {
    const errors = await prisma.$queryRawTyped(getAssetErrorsQuery(barcode))
    return successResponse(errors)
  } catch (error) {
    return response500(`Failed to fetch errors for ${barcode}`)
  }
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)

  if (words.length === 1) {
    // Single word: take first 2 characters
    return words[0].slice(0, 2).toUpperCase()
  }

  // Multiple words: take first letter of first 2 words
  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase()
}

export async function getComments(barcode: string): Promise<ApiResponse<Comment[]>> {
  try {
    const comments = await prisma.$queryRawTyped(getAssetCommentsQuery(barcode))
    const commentsWithInitials = comments.map(c => ({ ...c, initials: getInitials(c.username) }))
    return successResponse(commentsWithInitials)
  } catch (error) {
    return response500(`Failed to fetch comments for ${barcode}`)
  }
}

export async function getAssetPartTransfer(barcode: string): Promise<ApiResponse<PartTransfer[]>> {
  try {
    const parts = await prisma.$queryRawTyped(getAssetPartTransferQuery(barcode))
    return successResponse(parts)
  } catch (error) {
    return response500(`Failed to fetch part transfers for ${barcode}`)
  }
}

export async function getTransfers(barcode: string): Promise<ApiResponse<AssetTransfer[]>> {
  try {
    const transfers = await prisma.$queryRawTyped(getAssetTransfersQuery(barcode))
    return successResponse(transfers)
  } catch (error) {
    return response500(`Failed to fetch transfers for ${barcode}`)
  }
}

function mapAssetDetail(r: getAssetDetailsQuery.Result): AssetDetails {
  return {
    id: r.id,
    barcode: r.barcode,
    serial_number: r.serial_number,
    model: r.model,
    brand: r.brand,
    asset_type: r.asset_type,
    tracking_status: r.tracking_status,
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
    is_held: r.is_held,
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
    origin_street: r.departure_origin_city_code,
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

export async function createComment(barcode: string, data: CreateComment, userId: number): Promise<ApiResponse<void>> {
  try {
    const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
    if (!asset) return response400(`Asset ${barcode} not found`)
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
    return successResponse(undefined)
  } catch {
    return response500(`Failed to create comment for ${barcode}`)
  }
}

export async function createPartTransfer(recipientBarcode: string, data: CreatePartTransfer, userId: number): Promise<ApiResponse<void>> {
  if (data.donor_barcode === recipientBarcode) {
    return response400('Donor and recipient cannot be the same asset')
  }

  try {
    const recipient = await prisma.asset.findUnique({
      where: { barcode: recipientBarcode },
      select: { id: true }
    })
    if (!recipient) return response400(`Asset ${recipientBarcode} not found`)

    const donor = await prisma.asset.findUnique({
      where: { barcode: data.donor_barcode },
      select: { id: true }
    })
    if (!donor) return response400(`Donor asset ${data.donor_barcode} not found`)

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
    return successResponse(undefined)
  } catch (error) {
    return response500(`Failed to create part transfer for ${recipientBarcode}`)
  }
}

export async function updateAssetErrors(barcode: string, data: UpdateAssetErrors, userId: number): Promise<ApiResponse<void>> {
  try {
    const asset = await prisma.asset.findUnique({
      where: { barcode },
      select: { id: true, model: { select: { brand_id: true } } }
    })
    if (!asset) return response400(`Asset ${barcode} not found`)

    const assetId = asset.id
    const brandId = asset.model.brand_id

    const errorRecords = await prisma.error.findMany({
      where: { brand_id: brandId, code: { in: data.errors.map(e => e.code) } },
      select: { id: true, code: true }
    })
    const codeToId = new Map(errorRecords.map(e => [e.code, e.id]))

    const currentRows = await prisma.assetError.findMany({
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

    const deletes = currentRows
      .filter(ae => !inputIdMap.has(ae.error_id))
      .map(ae => prisma.assetError.delete({
        where: { asset_id_error_id: { asset_id: assetId, error_id: ae.error_id } }
      }))

    const inserts = [...inputIdMap.entries()]
      .filter(([errorId]) => !currentIdMap.has(errorId))
      .map(([errorId, is_fixed]) => prisma.assetError.create({
        data: {
          asset_id: assetId,
          error_id: errorId,
          is_fixed,
          added_by: userId,
          added_at: now,
          fixed_at: is_fixed ? now : null,
          fixed_by: is_fixed ? userId : null
        }
      }))

    const updates = [...inputIdMap.entries()]
      .filter(([errorId, is_fixed]) => currentIdMap.has(errorId) && currentIdMap.get(errorId) !== is_fixed)
      .map(([errorId, is_fixed]) => prisma.assetError.update({
        where: { asset_id_error_id: { asset_id: assetId, error_id: errorId } },
        data: {
          is_fixed,
          fixed_at: is_fixed ? now : null,
          fixed_by: is_fixed ? userId : null
        }
      }))

    await prisma.$transaction([...deletes, ...inserts, ...updates])
    return successResponse(undefined)
  } catch (error) {
    return response500(`Failed to update errors for asset ${barcode}`)
  }
}

export async function updateAssetPricing(barcode: string, data: UpdateAssetPricing): Promise<ApiResponse<void>> {
  try {
    const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
    if (!asset) return response400(`Asset ${barcode} not found`)

    const total_cost = data.purchase_cost + data.transport_cost + data.processing_cost + data.other_cost + data.parts_cost

    await prisma.cost.upsert({
      where: { asset_id: asset.id },
      update: { purchase_cost: data.purchase_cost, transport_cost: data.transport_cost, processing_cost: data.processing_cost, other_cost: data.other_cost, parts_cost: data.parts_cost, total_cost, sale_price: data.sale_price },
      create: { asset_id: asset.id, purchase_cost: data.purchase_cost, transport_cost: data.transport_cost, processing_cost: data.processing_cost, other_cost: data.other_cost, parts_cost: data.parts_cost, total_cost, sale_price: data.sale_price },
    })
    return successResponse(undefined)
  } catch (error) {
    return response500(`Failed to update pricing for asset ${barcode}`)
  }
}