import type { CreateModel, ModelSummary, UpdateModel } from 'shared-types'
import { normalizeName } from 'shared-types'
import { getModels as getModelsDb } from '../../generated/prisma/sql.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

async function assertNameAvailable(
  tx: Prisma.TransactionClient,
  brandId: number,
  name: string,
  excludeId: number | null,
): Promise<void> {
  const conflict = await tx.model.findFirst({
    where: {
      brand_id: brandId,
      name_normalized: normalizeName(name),
      ...(excludeId === null ? {} : { id: { not: excludeId } }),
    },
    select: { name: true },
  })
  if (conflict)
    throw new ConflictError(`A model named "${conflict.name}" already exists for that brand`)
}

export async function listModels(): Promise<ModelSummary[]> {
  return prisma.$queryRawTyped(getModelsDb())
}

export async function createModel(body: CreateModel): Promise<{ id: number }> {
  return prisma.$transaction(async (tx) => {
    await assertNameAvailable(tx, body.brand_id, body.name, null)
    const model = await tx.model.create({
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
  })
}

export async function updateModel(id: number, body: UpdateModel): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.model.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError(`Model ${id} not found`)

    await assertNameAvailable(tx, body.brand_id, body.name, id)
    await tx.model.update({
      where: { id },
      data: {
        name: body.name,
        weight: body.weight,
        size: body.size,
        brand_id: body.brand_id,
        asset_type_id: body.asset_type_id,
        is_colour: body.is_colour,
      },
    })
  })
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
    asset_type_id: model.asset_type_id,
    asset_type: assetType.asset_type,
    weight: model.weight,
    size: model.size,
    is_colour: model.is_colour,
  }
}
