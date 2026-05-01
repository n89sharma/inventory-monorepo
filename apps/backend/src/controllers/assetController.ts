import { Request, Response } from 'express'
import { ApiResponse, AssetDetails, AssetError, AssetSummary, AssetTransfer, BarcodeSuggestion, Comment, CreateCommentSchema, CreatePartTransferSchema, PartTransfer, response400, response500, successResponse, UpdateAssetErrorsSchema, UpdateAssetPricingSchema } from 'shared-types'
import { z } from 'zod'
import { getAssetByBarcode, getAssetsForQuery, searchBarcodes } from '../../generated/prisma/sql.js'
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
  updateAssetPricing as updateAssetPricingSer
} from '../services/assetService.js'

export const BarcodeSuggestionsQuerySchema = z.object({
  q: z.string().min(1)
})

export const AssetQuerySchema = z.object({
  model: z.string(),
  trackingStatusId: z.string().optional().transform(Number),
  availabilityStatusId: z.string().optional().transform(Number),
  technicalStatusId: z.string().optional().transform(Number),
  warehouseId: z.string().optional().transform(Number),
  meter: z.string().optional().transform(Number)
})

export async function getAssets(req: Request, res: Response<ApiResponse<AssetSummary[]>>) {
  try {
    const {
      model,
      trackingStatusId,
      availabilityStatusId,
      technicalStatusId,
      warehouseId,
      meter } = res.locals.query as z.infer<typeof AssetQuerySchema>

    const assets = await prisma.$queryRawTyped(getAssetsForQuery(
      model,
      isNaN(trackingStatusId) ? 0 : trackingStatusId,
      isNaN(availabilityStatusId) ? 0 : availabilityStatusId,
      isNaN(technicalStatusId) ? 0 : technicalStatusId,
      isNaN(warehouseId) ? 0 : warehouseId,
      isNaN(meter) ? -1 : meter
    ))
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

export async function getBarcodeSuggestions(req: Request, res: Response<ApiResponse<BarcodeSuggestion[]>>) {
  try {
    const { q } = res.locals.query as z.infer<typeof BarcodeSuggestionsQuerySchema>
    const results = await prisma.$queryRawTyped(searchBarcodes(q.toUpperCase()))
    res.json(successResponse(results))
  } catch {
    res.status(500).json(response500('Failed to fetch suggestions'))
  }
}
