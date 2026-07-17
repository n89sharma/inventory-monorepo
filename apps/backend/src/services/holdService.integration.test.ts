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
import { addRemoveCollectionFromAssetsAndRecord, archiveHold, createHold } from './holdService.js'

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

  it('numbers the hold H-<7-digit sequence>', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [asset]), refs.userId)
    expect(holdNumber).toMatch(/^H-\d{7}$/)
  })
})
