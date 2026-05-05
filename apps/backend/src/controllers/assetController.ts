import { Request, Response } from 'express'
import { ApiResponse, AssetDetails, AssetError, AssetLocation, AssetSummary, AssetTransfer, BarcodeSuggestion, BulkUpdateAssetPricingSchema, Comment, CreateCommentSchema, CreatePartTransferSchema, PartTransfer, response400, response500, successResponse, UpdateAssetErrorsSchema, UpdateAssetLocationSchema, UpdateAssetPricingSchema, UpdateAssetSpecsSchema } from 'shared-types'
import { z } from 'zod'
import { getAssetByBarcode, searchBarcodes } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import {
  getAssets as getAssetsSer,
  getAccessories as getAssetAccessoriesSer,
  getComments as getAssetCommentsSer,
  getAssetDetail as getAssetDetailSer,
  getErrors as getAssetErrorsSer,
  getAssetPartTransfer as getAssetPartTransferSer,
  getTransfers as getAssetTransfersSer,
  createComment as createCommentSer,
  createPartTransfer as createPartTransferSer,
  exportAssets as exportAssetsSer,
  updateAssetErrors as updateAssetErrorsSer,
  updateAssetLocation as updateAssetLocationSer,
  updateAssetPricing as updateAssetPricingSer,
  bulkUpdateAssetPricing as bulkUpdateAssetPricingSer,
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

export async function getAssets(req: Request, res: Response<ApiResponse<AssetSummary[]>>) {
  const {
    model,
    trackingStatusId,
    availabilityStatusIds,
    technicalStatusIds,
    warehouseIds,
    meter } = res.locals.query as z.infer<typeof AssetQuerySchema>

  const response = await getAssetsSer(
    model,
    isNaN(trackingStatusId) ? 0 : trackingStatusId,
    availabilityStatusIds,
    technicalStatusIds,
    warehouseIds,
    isNaN(meter) ? -1 : meter
  )
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
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

export async function bulkUpdateAssetPricing(req: Request, res: Response<ApiResponse<void>>) {
  const { items } = BulkUpdateAssetPricingSchema.parse(req.body)
  const response = await bulkUpdateAssetPricingSer(items)
  if (response.success) {
    return res.json(response)
  } else {
    return res.status(500).json(response)
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

export const ExportAssetsSchema = z.object({
  barcodes: z.array(z.string()).min(1).max(2000)
})

export async function exportAssets(req: Request, res: Response) {
  const { barcodes } = ExportAssetsSchema.parse(req.body)
  const response = await exportAssetsSer(barcodes)
  if (response.success) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="assets-export-${timestamp}.csv"`)
    return res.send(response.data)
  }
  const status = response.error.type === 'API_ERROR' ? 400 : 500
  return res.status(status).json(response)
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
