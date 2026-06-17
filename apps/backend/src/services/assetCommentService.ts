import { CreateComment } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'

export async function createComment(barcode: string, data: CreateComment, userId: number): Promise<void> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)
  const now = new Date()
  await prisma.comment.create({
    data: {
      asset_id: asset.id,
      created_by_id: userId,
      comment: data.comment,
      created_at: now,
      updated_at: now
    }
  })
}

/**
 * Upsert against the asset's latest comment row:
 *  - empty/null text → delete the latest row (if any)
 *  - non-empty text + latest exists → update text + updated_at
 *  - non-empty text + no rows → insert
 */
export async function upsertLatestComment(
  tx: Prisma.TransactionClient,
  assetId: number,
  text: string | null,
  userId: number,
  now: Date = new Date()
): Promise<void> {
  const latest = await tx.comment.findFirst({
    where: { asset_id: assetId },
    orderBy: { created_at: 'desc' },
    select: { id: true, comment: true }
  })

  const trimmed = text?.trim() ?? ''
  if (trimmed === '') {
    if (latest) await tx.comment.delete({ where: { id: latest.id } })
    return
  }

  if (latest) {
    if (latest.comment === trimmed) return
    await tx.comment.update({
      where: { id: latest.id },
      data: { comment: trimmed, updated_at: now }
    })
    return
  }

  await tx.comment.create({
    data: {
      asset_id: assetId,
      created_by_id: userId,
      comment: trimmed,
      created_at: now,
      updated_at: now
    }
  })
}
