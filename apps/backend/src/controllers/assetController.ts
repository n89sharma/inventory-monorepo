import { Request, Response } from 'express'
import { ApiResponse, AssetDetails, AssetError, AssetLocation, AssetSummary, AssetTransfer, BarcodeSuggestion, Comment, CreateCommentSchema, CreatePartTransferSchema, PartTransfer, response400, response500, successResponse, UpdateAssetErrorsSchema, UpdateAssetLocationSchema, UpdateAssetPricingSchema, UpdateAssetSpecsSchema } from 'shared-types'
import { z } from 'zod'
import { getAssetByBarcode, searchBarcodes } from '../../generated/prisma/sql.js'
import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../prisma.js'
import {
  getAccessories as getAssetAccessoriesSer,
  getComments as getAssetCommentsSer,
  getAssetDetail as getAssetDetailSer,
  getErrors as getAssetErrorsSer,
  getAssetPartTransfer as getAssetPartTransferSer,
  getTransfers as getAssetTransfersSer,
  createComment as createCommentSer,
  createPartTransfer as createPartTransferSer,
  updateAssetErrors as updateAssetErrorsSer,
  updateAssetLocation as updateAssetLocationSer,
  updateAssetPricing as updateAssetPricingSer,
  updateAssetSpecs as updateAssetSpecsSer,
  getLocationsByWarehouse as getLocationsByWarehouseSer
} from '../services/assetService.js'

export const BarcodeSuggestionsQuerySchema = z.object({
  q: z.string().min(1)
})

export const LocationsByWarehouseQuerySchema = z.object({
  warehouseId: z.string().transform(Number)
})

const toNumberArray = (val: unknown) =>
  val === undefined ? [] : Array.isArray(val) ? val : [val]

export const AssetQuerySchema = z.object({
  model: z.string(),
  trackingStatusId: z.string().optional().transform(Number),
  availabilityStatusIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  technicalStatusIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  warehouseIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  meter: z.string().optional().transform(Number)
})

function inFilter(col: string, ids: number[]) {
  if (ids.length === 0) return Prisma.sql`TRUE`
  return Prisma.sql`${Prisma.raw(col)} IN (${Prisma.join(ids)})`
}

export async function getAssets(req: Request, res: Response<ApiResponse<AssetSummary[]>>) {
  try {
    const {
      model,
      trackingStatusId,
      availabilityStatusIds,
      technicalStatusIds,
      warehouseIds,
      meter } = res.locals.query as z.infer<typeof AssetQuerySchema>

    const trackingId = isNaN(trackingStatusId) ? 0 : trackingStatusId
    const meterParam = isNaN(meter) ? -1 : meter

    const assets = await prisma.$queryRaw<AssetSummary[]>`
      SELECT a.id, b."name" AS brand, m."name" AS model,
             at.asset_type, a.barcode, a.serial_number, t.meter_total,
             w.city_code AS warehouse_city_code, w.street AS warehouse_street,
             tr.status AS tracking_status,
             av.status AS availability_status,
             te.status AS technical_status
      FROM "Asset" a
        JOIN "TechnicalSpecification" t ON t.asset_id = a.id
        JOIN "Model" m ON m.id = a.model_id
        JOIN "Brand" b ON b.id = m.brand_id
        JOIN "AssetType" at ON at.id = m.asset_type_id
        JOIN "TrackingStatus" tr ON tr.id = a.tracking_status_id
        JOIN "AvailabilityStatus" av ON av.id = a.availability_status_id
        JOIN "TechnicalStatus" te ON te.id = a.technical_status_id
        LEFT JOIN "Location" l ON l.id = a.location_id
        LEFT JOIN "Warehouse" w ON w.id = l.warehouse_id
      WHERE m."name" ~* ${model}
        AND (${trackingId} = 0 OR tr.id = ${trackingId})
        AND ${inFilter('av.id', availabilityStatusIds)}
        AND ${inFilter('te.id', technicalStatusIds)}
        AND ${inFilter('w.id', warehouseIds)}
        AND (${meterParam} = -1 OR t.meter_total <= ${meterParam})
    `
    res.json(successResponse(assets))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch assets'))
  }
}

export async function getAssetDetail(req: Request, res: Response<ApiResponse<AssetDetails>>) {
  const { barcode } = req.params
  const response = await getAssetDetailSer(barcode)
  if (response.success) {
    return res.json(response)
  } else {
    if (response.error.status === 400) {
      return res.status(404).json(response)
    } else {
      return res.status(500).json(response)
    }
  }
}

export async function getAssetAccessories(req: Request, res: Response<ApiResponse<string[]>>) {
  const { barcode } = req.params
  const response = await getAssetAccessoriesSer(barcode)
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
  }
}

export async function getAssetErrors(req: Request, res: Response<ApiResponse<AssetError[]>>) {
  const { barcode } = req.params
  const response = await getAssetErrorsSer(barcode)
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
  }
}

export async function getAssetComments(req: Request, res: Response<ApiResponse<Comment[]>>) {
  const { barcode } = req.params
  const response = await getAssetCommentsSer(barcode)
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
  }
}

export async function getAssetPartTransfer(req: Request, res: Response<ApiResponse<PartTransfer[]>>) {
  const { barcode } = req.params
  const response = await getAssetPartTransferSer(barcode)
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
  }
}

export async function getAssetTransfers(req: Request, res: Response<ApiResponse<AssetTransfer[]>>) {
  const { barcode } = req.params
  const response = await getAssetTransfersSer(barcode)
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
  }
}

export async function getAssetSummaryByBarcode(req: Request, res: Response<ApiResponse<AssetSummary>>) {
  try {
    const { barcode } = req.params
    const results = await prisma.$queryRawTyped(getAssetByBarcode(barcode))
    if (results.length === 0) {
      return res.status(404).json(response400(`Asset ${barcode} not found`))
    }
    return res.json(successResponse(results[0]))
  } catch (error) {
    return res.status(500).json(response500('Failed to fetch asset'))
  }
}

export async function createAssetComment(req: Request, res: Response<ApiResponse<void>>) {
  const { barcode } = req.params
  const validated = CreateCommentSchema.parse(req.body)
  const response = await createCommentSer(barcode, validated, res.locals.dbUserId)
  if (response.success) {
    return res.status(201).json(response)
  } else {
    const status = response.error.type === 'API_ERROR' ? 400 : 500
    return res.status(status).json(response)
  }
}

export async function createPartTransfer(req: Request, res: Response<ApiResponse<void>>) {
  const { barcode } = req.params
  const validated = CreatePartTransferSchema.parse(req.body)
  const response = await createPartTransferSer(barcode, validated, res.locals.dbUserId)
  if (response.success) {
    return res.status(201).json(response)
  } else {
    const status = response.error.type === 'API_ERROR' ? 400 : 500
    return res.status(status).json(response)
  }
}

export async function updateAssetErrors(req: Request, res: Response<ApiResponse<void>>) {
  const { barcode } = req.params
  const validated = UpdateAssetErrorsSchema.parse(req.body)
  const response = await updateAssetErrorsSer(barcode, validated, res.locals.dbUserId)
  if (response.success) {
    return res.json(response)
  } else {
    const status = response.error.type === 'API_ERROR' ? 404 : 500
    return res.status(status).json(response)
  }
}

export async function updateAssetPricing(req: Request, res: Response<ApiResponse<void>>) {
  const { barcode } = req.params
  const validated = UpdateAssetPricingSchema.parse(req.body)
  const response = await updateAssetPricingSer(barcode, validated)
  if (response.success) {
    return res.json(response)
  } else {
    const status = response.error.type === 'API_ERROR' ? 404 : 500
    return res.status(status).json(response)
  }
}

export async function updateAssetSpecs(req: Request, res: Response<ApiResponse<void>>) {
  const { barcode } = req.params
  const validated = UpdateAssetSpecsSchema.parse(req.body)
  const response = await updateAssetSpecsSer(barcode, validated)
  if (response.success) {
    return res.json(response)
  } else {
    const status = response.error.type === 'API_ERROR' ? 404 : 500
    return res.status(status).json(response)
  }
}

export async function getLocationsByWarehouse(req: Request, res: Response<ApiResponse<AssetLocation[]>>) {
  const { warehouseId } = res.locals.query as z.infer<typeof LocationsByWarehouseQuerySchema>
  const response = await getLocationsByWarehouseSer(warehouseId)
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
  }
}

export async function updateAssetLocation(req: Request, res: Response<ApiResponse<void>>) {
  const { barcode } = req.params
  const validated = UpdateAssetLocationSchema.parse(req.body)
  const response = await updateAssetLocationSer(barcode, validated)
  if (response.success) {
    return res.json(response)
  } else {
    const status = response.error.type === 'API_ERROR' ? 400 : 500
    return res.status(status).json(response)
  }
}

export async function getBarcodeSuggestions(req: Request, res: Response<ApiResponse<BarcodeSuggestion[]>>) {
  try {
    const { q } = res.locals.query as z.infer<typeof BarcodeSuggestionsQuerySchema>
    const results = await prisma.$queryRawTyped(searchBarcodes(q.toUpperCase()))
    res.json(successResponse(results))
  } catch {
    res.status(500).json(response500('Failed to fetch suggestions'))
  }
}
