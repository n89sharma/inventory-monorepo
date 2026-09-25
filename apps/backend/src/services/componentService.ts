import type {
  ComponentMergePreview,
  ComponentSummary,
  CreateComponent,
  MergeComponentFields,
  UpdateComponent,
} from 'shared-types'
import {
  getComponentReferenceCounts as getComponentReferenceCountsDb,
  getComponents as getComponentsDb,
} from '../../generated/prisma/sql.js'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

async function assertNameAvailable(
  tx: Prisma.TransactionClient,
  brandId: number,
  name: string,
  excludeIds: number[],
): Promise<void> {
  const conflict = await tx.component.findFirst({
    where: {
      brand_id: brandId,
      name,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    },
    select: { name: true },
  })
  if (conflict)
    throw new ConflictError(`A component named "${conflict.name}" already exists for that brand`)
}

export async function listComponents(): Promise<ComponentSummary[]> {
  const rows = await prisma.$queryRawTyped(getComponentsDb())
  return rows.map((row) => ({ ...row, asset_count: row.asset_count ?? 0 }))
}

export async function createComponent(body: CreateComponent): Promise<{ id: number }> {
  return prisma.$transaction(async (tx) => {
    await assertNameAvailable(tx, body.brand_id, body.name, [])
    const component = await tx.component.create({
      data: { name: body.name, brand_id: body.brand_id, is_active: body.is_active },
    })
    return { id: component.id }
  })
}

export async function updateComponent(id: number, body: UpdateComponent): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.component.findUnique({ where: { id }, select: { brand_id: true } })
    if (!existing) throw new NotFoundError(`Component ${id} not found`)

    if (existing.brand_id !== body.brand_id) {
      const assetCount = await tx.technicalSpecification.count({ where: { component_id: id } })
      if (assetCount > 0)
        throw new ConflictError('The brand of a component already on assets cannot be changed')
    }

    await assertNameAvailable(tx, body.brand_id, body.name, [id])
    await tx.component.update({
      where: { id },
      data: { name: body.name, brand_id: body.brand_id, is_active: body.is_active },
    })
  })
}

type ComponentMergeCandidates = ComponentMergePreview & { brand_id: number }

async function readMergeCandidates(
  tx: Prisma.TransactionClient,
  ids: number[],
): Promise<ComponentMergeCandidates> {
  const rows = await tx.$queryRawTyped(getComponentReferenceCountsDb(ids))
  if (rows.length !== ids.length)
    throw new NotFoundError('One or more of those components no longer exists')

  const brandIds = new Set(rows.map((row) => row.brand_id))
  if (brandIds.size > 1)
    throw new ValidationError('Only components of the same brand can be merged')

  const candidates = rows.map((row) => ({
    id: row.id,
    brand_name: row.brand_name,
    name: row.name,
    reference_count: row.reference_count ?? 0,
  }))
  // The query orders by reference_count desc, so the winner is first.
  return { winner_id: candidates[0].id, brand_id: rows[0].brand_id, candidates }
}

export async function previewComponentMerge(ids: number[]): Promise<ComponentMergePreview> {
  const { winner_id, candidates } = await prisma.$transaction((tx) => readMergeCandidates(tx, ids))
  return { winner_id, candidates }
}

export async function mergeComponents(
  ids: number[],
  body: MergeComponentFields,
): Promise<{ id: number }> {
  return prisma.$transaction(async (tx) => {
    const { winner_id: winnerId, brand_id: brandId } = await readMergeCandidates(tx, ids)
    const loserIds = ids.filter((id) => id !== winnerId)

    await assertNameAvailable(tx, brandId, body.name, ids)

    await tx.technicalSpecification.updateMany({
      where: { component_id: { in: loserIds } },
      data: { component_id: winnerId },
    })

    // A relation missed above would otherwise surface as a bare foreign key error from the
    // delete. Naming the row that still holds references makes that a fixable report.
    const remaining = await tx.$queryRawTyped(getComponentReferenceCountsDb(loserIds))
    const stillReferenced = remaining.filter((row) => (row.reference_count ?? 0) > 0)
    if (stillReferenced.length > 0)
      throw new ConflictError(
        `"${stillReferenced[0].name}" still has assets that could not be moved`,
      )

    // Losers go before the winner is renamed: the kept name may be a loser's, and
    // @@unique([brand_id, name]) would reject it while that row still exists.
    await tx.component.deleteMany({ where: { id: { in: loserIds } } })
    await tx.component.update({
      where: { id: winnerId },
      data: { name: body.name, is_active: body.is_active },
    })
    return { id: winnerId }
  })
}
