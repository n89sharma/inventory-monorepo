import { ASSET_STATUS, OUTGOING_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateDepartureInput,
  buildCreateHoldInput,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetStatus,
  seedArrivalTestData,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { harvestAssets, returnHarvestedAssetsToStock } from './assetStatusService.js'
import { createDeparture } from './departureService.js'
import { addRemoveCollectionFromAssetsAndRecord, createHold } from './holdService.js'

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

async function getStatusChanges(assetId: number, sinceId: number): Promise<unknown[]> {
  const rows = await prisma.history.findMany({
    where: { id: { gt: sinceId }, entity_type: 'Asset', entity_id: assetId },
  })
  return rows
    .map((row) => (row.changes as { after?: { status?: unknown } }).after?.status)
    .filter((status) => status !== undefined)
}

describe('assetStatusService', () => {
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

  it('harvests in-stock assets in place and records the status change', async () => {
    const assets = await createArrivedAssets(refs, 2)
    const sinceId = await getMaxHistoryId()

    await harvestAssets(
      assets.map((a) => a.id),
      refs.userId,
    )

    for (const asset of assets) {
      expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.HARVESTED)
      expect(await getStatusChanges(asset.id, sinceId)).toEqual([ASSET_STATUS.HARVESTED])
    }
  })

  it('rejects the whole batch when one asset is held', async () => {
    const [free, held] = await createArrivedAssets(refs, 2)
    await createHold(buildCreateHoldInput(refs, [held]), refs.userId)

    await expect(harvestAssets([free.id, held.id], refs.userId)).rejects.toThrow(ConflictError)

    expect(await getAssetStatus(free.id)).toBe(ASSET_STATUS.IN_STOCK)
    expect(await getAssetStatus(held.id)).toBe(ASSET_STATUS.HELD)
  })

  it('rejects an asset in transit', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await prisma.asset.update({ where: { id: asset.id }, data: { is_in_transit: true } })

    await expect(harvestAssets([asset.id], refs.userId)).rejects.toThrow(ConflictError)

    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
  })

  it('rejects an asset on a departure', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createDeparture(
      buildCreateDepartureInput(refs, [{ id: asset.id, outgoing_status: OUTGOING_STATUS.SOLD }]),
      refs.userId,
    )

    await expect(harvestAssets([asset.id], refs.userId)).rejects.toThrow(ConflictError)

    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
  })

  it('returns harvested assets to stock', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await harvestAssets([asset.id], refs.userId)
    const sinceId = await getMaxHistoryId()

    await returnHarvestedAssetsToStock([asset.id], refs.userId)

    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.IN_STOCK)
    expect(await getStatusChanges(asset.id, sinceId)).toEqual([ASSET_STATUS.IN_STOCK])
  })

  it('refuses to return an asset that is not harvested', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(returnHarvestedAssetsToStock([asset.id], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('refuses to return a harvested asset that has since departed', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await harvestAssets([asset.id], refs.userId)
    await createDeparture(
      buildCreateDepartureInput(refs, [
        { id: asset.id, outgoing_status: OUTGOING_STATUS.SCRAPPED },
      ]),
      refs.userId,
    )

    await expect(returnHarvestedAssetsToStock([asset.id], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('keeps a harvested asset off a new hold', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await harvestAssets([asset.id], refs.userId)

    await expect(createHold(buildCreateHoldInput(refs, [asset]), refs.userId)).rejects.toThrow(
      ConflictError,
    )

    expect(await getAssetStatus(asset.id)).toBe(ASSET_STATUS.HARVESTED)
  })

  it('keeps a harvested asset off an existing hold', async () => {
    const [heldAsset, harvestedAsset] = await createArrivedAssets(refs, 2)
    const holdNumber = await createHold(buildCreateHoldInput(refs, [heldAsset]), refs.userId)
    await harvestAssets([harvestedAsset.id], refs.userId)

    await expect(
      addRemoveCollectionFromAssetsAndRecord(
        holdNumber,
        { assetIdsToAdd: [harvestedAsset.id], assetIdsToRemove: [] },
        refs.userId,
      ),
    ).rejects.toThrow(ConflictError)

    expect(await getAssetStatus(harvestedAsset.id)).toBe(ASSET_STATUS.HARVESTED)
  })
})
