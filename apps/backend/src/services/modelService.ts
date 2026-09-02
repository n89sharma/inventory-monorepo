import type { CreateModel, ModelMergePreview, ModelSummary, UpdateModel } from 'shared-types'
import { normalizeName } from 'shared-types'
import {
  getModelReferenceCounts as getModelReferenceCountsDb,
  getModels as getModelsDb,
} from '../../generated/prisma/sql.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

function toModelData(body: CreateModel | UpdateModel) {
  return {
    name: body.name,
    weight: body.weight,
    size: body.size,
    brand_id: body.brand_id,
    asset_type_id: body.asset_type_id,
    is_colour: body.is_colour,
  }
}

// excludeIds are the rows the caller already owns: the one being updated, or every row taking
// part in a merge. A merge writes the surviving row's name while its losers still exist, so all
// of them have to be invisible to this check.
async function assertNameAvailable(
  tx: Prisma.TransactionClient,
  brandId: number,
  name: string,
  excludeIds: number[],
): Promise<void> {
  const conflict = await tx.model.findFirst({
    where: {
      brand_id: brandId,
      name_normalized: normalizeName(name),
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
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
    await assertNameAvailable(tx, body.brand_id, body.name, [])
    const model = await tx.model.create({ data: toModelData(body) })
    return { id: model.id }
  })
}

export async function updateModel(id: number, body: UpdateModel): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.model.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError(`Model ${id} not found`)

    await assertNameAvailable(tx, body.brand_id, body.name, [id])
    await tx.model.update({ where: { id }, data: toModelData(body) })
  })
}

async function readMergeCandidates(
  tx: Prisma.TransactionClient,
  ids: number[],
): Promise<ModelMergePreview> {
  const rows = await tx.$queryRawTyped(getModelReferenceCountsDb(ids))
  if (rows.length !== ids.length)
    throw new NotFoundError('One or more of those models no longer exists')

  const candidates = rows.map((row) => ({ ...row, reference_count: row.reference_count ?? 0 }))
  // The query orders by reference_count desc, so the winner is first.
  return { winner_id: candidates[0].id, candidates }
}

export async function previewModelMerge(ids: number[]): Promise<ModelMergePreview> {
  return prisma.$transaction((tx) => readMergeCandidates(tx, ids))
}

export async function mergeModels(ids: number[], body: UpdateModel): Promise<{ id: number }> {
  return prisma.$transaction(async (tx) => {
    const { winner_id: winnerId } = await readMergeCandidates(tx, ids)
    const loserIds = ids.filter((id) => id !== winnerId)

    await assertNameAvailable(tx, body.brand_id, body.name, ids)

    await tx.asset.updateMany({
      where: { model_id: { in: loserIds } },
      data: { model_id: winnerId },
    })

    await tx.model.update({ where: { id: winnerId }, data: toModelData(body) })

    // A relation missed above would otherwise surface as a bare foreign key error from the
    // delete. Naming the row that still holds references makes that a fixable report.
    const remaining = await tx.$queryRawTyped(getModelReferenceCountsDb(loserIds))
    const stillReferenced = remaining.filter((row) => (row.reference_count ?? 0) > 0)
    if (stillReferenced.length > 0)
      throw new ConflictError(
        `"${stillReferenced[0].model_name}" still has assets that could not be moved`,
      )

    await tx.model.deleteMany({ where: { id: { in: loserIds } } })
    return { id: winnerId }
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
