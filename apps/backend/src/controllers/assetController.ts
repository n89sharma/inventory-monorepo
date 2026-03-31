import { Request, Response } from 'express'
import { ApiResponse, AssetDetails, AssetSummary, AssetTransfer, Comment, Error, Part, response500, successResponse } from 'shared-types'
import { z } from 'zod'
import { getAssetsForQuery } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import {
  getAssetAccessories as getAssetAccessoriesSer,
  getAssetComments as getAssetCommentsSer,
  getAssetDetail as getAssetDetailSer,
  getAssetErrors as getAssetErrorsSer,
  getAssetParts as getAssetPartsSer,
  getAssetTransfers as getAssetTransfersSer
} from '../services/assetService.js'

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

export async function getAssetErrors(req: Request, res: Response<ApiResponse<Error[]>>) {
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

export async function getAssetParts(req: Request, res: Response<ApiResponse<Part[]>>) {
  const { barcode } = req.params
  const response = await getAssetPartsSer(barcode)
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
