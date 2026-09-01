import type { CreateModel, ModelSummary } from 'shared-types'
import { getModels as getModelsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function listModels(): Promise<ModelSummary[]> {
  return prisma.$queryRawTyped(getModelsDb())
}

export async function createModel(body: CreateModel): Promise<{ id: number }> {
  const model = await prisma.model.create({
    data: {
      name: body.name,
      weight: body.weight,
      size: body.size,
      brand_id: body.brand_id,
      asset_type_id: body.asset_type_id,
      is_colour: body.is_colour,
    },
  })
  return { id: model.id }
}

export async function getModelSummary(modelId: number): Promise<ModelSummary> {
  const model = await prisma.model.findUnique({ where: { id: modelId } })
  if (model === null) throw new Error(`Model with ID ${modelId} not found`)

  const brand = await prisma.brand.findUnique({ where: { id: model.brand_id } })
  if (brand === null)
    throw new Error(`Brand with ID ${model.brand_id} for model ${model.name} not found`)

  const assetType = await prisma.assetType.findUnique({ where: { id: model.asset_type_id } })
  if (assetType === null)
    throw new Error(`Asset type with ID ${model.asset_type_id} for model ${model.name} not found`)

  return {
    id: model.id,
    brand_id: model.brand_id,
    brand_name: brand.name,
    model_name: model.name,
    asset_type: assetType.asset_type,
    weight: model.weight,
    size: model.size,
    is_colour: model.is_colour,
  }
}
