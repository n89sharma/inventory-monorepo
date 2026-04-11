import { Request, Response } from 'express'
import { ApiResponse, CreateModelSchema, ModelSummary, response400, response500, successResponse } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { getModels as getModelsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getModels(req: Request, res: Response<ApiResponse<ModelSummary[]>>) {
  try {
    const models = await prisma.$queryRawTyped(getModelsDb())
    res.json(successResponse(models))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch models'))
  }
}

export async function createModel(req: Request, res: Response<ApiResponse<{ id: number }>>) {
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json(response400('A model with this name already exists for this brand'))
    }
    res.status(500).json(response500('Failed to create model'))
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