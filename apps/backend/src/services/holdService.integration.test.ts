import { ASSET_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateHoldInput,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetStatus,
  seedArrivalTestData,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  addRemoveCollectionFromAssetsAndRecord,
  archiveHold,
  createHold,
  moveAssetsToHold,
} from './holdService.js'

async function getHoldId(holdNumber: string): Promise<number> {
  const hold = await prisma.hold.findUniqueOrThrow({
    where: { hold_number: holdNumber },
    select: { id: true },
  })
  return hold.id
}

async function getHoldArchivedAt(holdNumber: string): Promise<Date | null> {
  const hold = await prisma.hold.findUniqueOrThrow({
    where: { hold_number: holdNumber },
    select: { archived_at: true },
  })
  return hold.archived_at
}

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

describe('holdService', () => {
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

  it('sets every held asset to HELD on creation', async () => {
    const assets = await createArrivedAssets(refs, 2)
    await createHold(buildCreateHoldInput(refs, assets), refs.userId)

    for (const asset of assets) {
      expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.HELD)
    }
  })

  it('returns an asset to IN_STOCK when removed from a hold', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)
    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.HELD)

    await addRemoveCollectionFromAssetsAndRecord(
      holdNumber,
      { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
      refs.userId,
    )

    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
  })

  it('keeps the hold active when a removal leaves assets on it', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const holdNumber = await createHold(buildCreateHoldInput(refs, assets), refs.userId)

    await addRemoveCollectionFromAssetsAndRecord(
      holdNumber,
      { assetIdsToAdd: [], assetIdsToRemove: [assets[0].id] },
      refs.userId,
    )

    const hold = await prisma.hold.findUniqueOrThrow({
      where: { hold_number: holdNumber },
      select: { archived_at: true },
    })
    expect(hold.archived_at).toBeNull()
  })

  it('auto-archives the hold when its last asset is removed', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const holdNumber = await createHold(buildCreateHoldInput(refs, assets), refs.userId)

    await addRemoveCollectionFromAssetsAndRecord(
      holdNumber,
      { assetIdsToAdd: [], assetIdsToRemove: assets.map((a) => a.id) },
      refs.userId,
    )

    for (const asset of assets) {
      expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
    }
    const hold = await prisma.hold.findUniqueOrThrow({
      where: { hold_number: holdNumber },
      select: { archived_at: true },
    })
    expect(hold.archived_at).not.toBeNull()
  })

  it('does not archive when a delta both empties and re-adds an asset', async () => {
    const [existing, fresh] = await createArrivedAssets(refs, 2)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [existing]), refs.userId)

    await addRemoveCollectionFromAssetsAndRecord(
      holdNumber,
      { assetIdsToAdd: [fresh.id], assetIdsToRemove: [existing.id] },
      refs.userId,
    )

    const hold = await prisma.hold.findUniqueOrThrow({
      where: { hold_number: holdNumber },
      select: { archived_at: true },
    })
    expect(hold.archived_at).toBeNull()
    expect(await getAssetStatus(fresh.id)).toBe(ASSET_STATUS.HELD)
  })

  it('releases all held assets to IN_STOCK and stamps archived_at when archived', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const holdNumber = await createHold(buildCreateHoldInput(refs, assets), refs.userId)

    await archiveHold(holdNumber, refs.userId)

    for (const asset of assets) {
      expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
    }
    const hold = await prisma.hold.findUniqueOrThrow({
      where: { hold_number: holdNumber },
      select: { archived_at: true },
    })
    expect(hold.archived_at).not.toBeNull()
  })

  it('rejects holding an asset that already has an active hold', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)

    await expect(createHold(buildCreateHoldInput(refs, [asset]), refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('rejects editing the assets of an archived hold', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)
    await archiveHold(holdNumber, refs.userId)

    await expect(
      addRemoveCollectionFromAssetsAndRecord(
        holdNumber,
        { assetIdsToAdd: [], assetIdsToRemove: [asset.id] },
        refs.userId,
      ),
    ).rejects.toThrow(ConflictError)
  })

  it('moves assets to the destination hold while keeping them HELD', async () => {
    const [a0, a1, a2] = await createArrivedAssets(refs, 3)
    const source = await createHold(buildCreateHoldInput(refs, [a0, a1]), refs.userId)
    const destination = await createHold(buildCreateHoldInput(refs, [a2]), refs.userId)

    await moveAssetsToHold(source, destination, [a0.id], refs.userId)

    expect(await getAssetStatus(a0.id)).toBe(ASSET_STATUS.HELD)
    const moved = await prisma.asset.findUniqueOrThrow({
      where: { id: a0.id },
      select: { hold_id: true },
    })
    expect(moved.hold_id).toBe(await getHoldId(destination))
  })

  it('auto-archives the source when a move empties it, leaving the destination active', async () => {
    const [a0, a1, a2] = await createArrivedAssets(refs, 3)
    const source = await createHold(buildCreateHoldInput(refs, [a0, a1]), refs.userId)
    const destination = await createHold(buildCreateHoldInput(refs, [a2]), refs.userId)

    await moveAssetsToHold(source, destination, [a0.id, a1.id], refs.userId)

    expect(await getHoldArchivedAt(source)).not.toBeNull()
    expect(await getHoldArchivedAt(destination)).toBeNull()
  })

  it('keeps the source active when a move leaves assets on it', async () => {
    const [a0, a1, a2] = await createArrivedAssets(refs, 3)
    const source = await createHold(buildCreateHoldInput(refs, [a0, a1]), refs.userId)
    const destination = await createHold(buildCreateHoldInput(refs, [a2]), refs.userId)

    await moveAssetsToHold(source, destination, [a0.id], refs.userId)

    expect(await getHoldArchivedAt(source)).toBeNull()
  })

  it('records the move as a single hold_number change with no status change', async () => {
    const [a0, a1, a2] = await createArrivedAssets(refs, 3)
    const source = await createHold(buildCreateHoldInput(refs, [a0, a1]), refs.userId)
    const destination = await createHold(buildCreateHoldInput(refs, [a2]), refs.userId)
    const sinceId = await getMaxHistoryId()

    await moveAssetsToHold(source, destination, [a0.id], refs.userId)

    const newRows = await prisma.history.findMany({ where: { id: { gt: sinceId } } })

    const assetRows = newRows.filter(
      (r) => r.entity_type === 'Asset' && r.entity_id === a0.id && r.action_type === 'UPDATE',
    )
    const holdChanges = assetRows.map(
      (r) => r.changes as { before?: Record<string, unknown>; after?: Record<string, unknown> },
    )
    const moveRows = holdChanges.filter((c) => c.after?.hold_number !== undefined)
    expect(moveRows).toHaveLength(1)
    expect(moveRows[0].before?.hold_number).toBe(source)
    expect(moveRows[0].after?.hold_number).toBe(destination)
    expect(holdChanges.some((c) => c.after?.status !== undefined)).toBe(false)

    const removedRow = newRows.find(
      (r) => r.entity_type === 'Hold' && r.action_type === 'ASSETS_REMOVED',
    )
    const addedRow = newRows.find(
      (r) => r.entity_type === 'Hold' && r.action_type === 'ASSETS_ADDED',
    )
    expect(removedRow?.entity_id).toBe(await getHoldId(source))
    expect(addedRow?.entity_id).toBe(await getHoldId(destination))
  })

  it('rejects moving assets to the same hold', async () => {
    const [a0, a1] = await createArrivedAssets(refs, 2)
    const source = await createHold(buildCreateHoldInput(refs, [a0, a1]), refs.userId)

    await expect(moveAssetsToHold(source, source, [a0.id], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('rejects moving assets into an archived hold', async () => {
    const [a0, a1, a2] = await createArrivedAssets(refs, 3)
    const source = await createHold(buildCreateHoldInput(refs, [a0, a1]), refs.userId)
    const destination = await createHold(buildCreateHoldInput(refs, [a2]), refs.userId)
    await archiveHold(destination, refs.userId)

    await expect(moveAssetsToHold(source, destination, [a0.id], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('rejects moving an asset that is not on the source hold', async () => {
    const [a0, a1, a2] = await createArrivedAssets(refs, 3)
    const source = await createHold(buildCreateHoldInput(refs, [a0]), refs.userId)
    const destination = await createHold(buildCreateHoldInput(refs, [a1]), refs.userId)

    await expect(moveAssetsToHold(source, destination, [a2.id], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('numbers the hold H-<7-digit sequence>', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)
    expect(holdNumber).toMatch(/^H-\d{7}$/)
  })
})
