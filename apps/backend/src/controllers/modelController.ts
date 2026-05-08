import { NextFunction, Request, Response } from 'express'
import { ApiResponse, CreateModelSchema, ModelSummary, successResponse } from 'shared-types'
import { getModels as getModelsDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { prisma } from '../prisma.js'

export const getModels = asyncHandler(async (req: Request, res: Response<ApiResponse<ModelSummary[]>>) => {
  const models = await prisma.$queryRawTyped(getModelsDb())
  res.json(successResponse(models))
})

export async function createModel(
  req: Request,
  res: Response<ApiResponse<{ id: number }>>,
  next: NextFunction
) {
  try {
    const body = CreateModelSchema.parse(req.body)
    const model = await prisma.model.create({
      data: {
        name: body.name,
        weight: body.weight,
        size: body.size,
        brand_id: body.brand_id,
        asset_type_id: body.asset_type_id
      }
    })
    res.status(201).json(successResponse({ id: model.id }))
  } catch (error) {
    next(error)
  }
}

export async function mapDbModelToSummaryModel(modelId: number): Promise<ModelSummary> {
  const model = await prisma.model.findUnique({ where: { id: modelId } })
  if (model === null)
    throw new Error(`Model with ID ${modelId} not found`)

  const brand = await prisma.brand.findUnique({ where: { id: model.brand_id } })
  if (brand === null)
    throw new Error(`Brand with ID ${model.brand_id} for model ${model.name} not found`)

  const assetType = await prisma.assetType.findUnique({ where: { id: model.asset_type_id } })
  if (assetType === null)
    throw new Error(`Asset type with ID ${model.asset_type_id} for model ${model.name} not found`)

  return {
    id: model.id,
    brand_name: brand.name,
    model_name: model.name,
    asset_type: assetType.asset_type,
    weight: model.weight,
    size: model.size
  }
}
