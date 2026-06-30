import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
} from '../../test/factories.js'
import { prisma } from '../prisma.js'
import { createComment, upsertLatestComment } from './assetCommentService.js'

describe('assetCommentService', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('createComment appends a comment row', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await createComment(asset.barcode, { comment: 'hello' }, refs.userId)

    const rows = await prisma.comment.findMany({ where: { asset_id: asset.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0].comment).toBe('hello')
  })

  it('upsertLatestComment creates the first comment, then updates it in place', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await prisma.$transaction((tx) => upsertLatestComment(tx, asset.id, 'first', refs.userId))
    await prisma.$transaction((tx) => upsertLatestComment(tx, asset.id, 'second', refs.userId))

    const rows = await prisma.comment.findMany({ where: { asset_id: asset.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0].comment).toBe('second')
  })

  it('upsertLatestComment is a no-op when the text is unchanged', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const firstWrite = new Date('2026-01-01T00:00:00.000Z')
    const secondWrite = new Date('2026-02-02T00:00:00.000Z')

    await prisma.$transaction((tx) =>
      upsertLatestComment(tx, asset.id, 'same', refs.userId, firstWrite),
    )
    await prisma.$transaction((tx) =>
      upsertLatestComment(tx, asset.id, 'same', refs.userId, secondWrite),
    )

    const row = await prisma.comment.findFirstOrThrow({ where: { asset_id: asset.id } })
    expect(row.updated_at).toEqual(firstWrite)
  })

  it('upsertLatestComment deletes the latest comment when given empty text', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await prisma.$transaction((tx) =>
      upsertLatestComment(tx, asset.id, 'to be removed', refs.userId),
    )

    await prisma.$transaction((tx) => upsertLatestComment(tx, asset.id, '', refs.userId))

    const rows = await prisma.comment.findMany({ where: { asset_id: asset.id } })
    expect(rows).toHaveLength(0)
  })
})
