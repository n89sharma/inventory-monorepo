import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateTransferInput,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
} from '../../test/factories.js'
import { createTransfer, dispatchTransfer } from './transferService.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { bulkUpdateAssetLocation, updateAssetLocation } from './assetLocationService.js'

const MISSING_ID = 999999

async function createShelf(refs: ArrivalTestData, bin: string): Promise<void> {
  await prisma.location.upsert({
    where: {
      warehouse_id_zone_id_bin: {
        warehouse_id: refs.warehouse.id,
        zone_id: refs.binZoneId,
        bin,
      },
    },
    create: { warehouse_id: refs.warehouse.id, zone_id: refs.binZoneId, bin },
    update: {},
  })
}

function shelf(refs: ArrivalTestData, bin: string) {
  return { warehouse_id: refs.warehouse.id, zone_id: refs.binZoneId, bin }
}

async function binsOf(assetIds: number[]): Promise<(string | null)[]> {
  const rows = await prisma.asset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, location: { select: { bin: true } } },
    orderBy: { id: 'asc' },
  })
  return rows.map((r) => r.location?.bin ?? null)
}

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

async function locationHistoryCount(sinceId: number, assetIds: number[]): Promise<number> {
  return prisma.history.count({
    where: {
      id: { gt: sinceId },
      entity_type: 'Asset',
      entity_id: { in: assetIds },
      action_type: 'UPDATE',
    },
  })
}

describe('assetLocationService', () => {
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

  it('relocates an asset into an existing BIN shelf', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createShelf(refs, 'A1')

    await updateAssetLocation(asset.barcode, shelf(refs, 'A1'), refs.userId)

    const row = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { location: { select: { bin: true, zone_id: true } } },
    })
    expect(row.location?.zone_id).toBe(refs.binZoneId)
    expect(row.location?.bin).toBe('A1')
  })

  it('rejects relocating to a shelf that does not exist', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(
      updateAssetLocation(
        asset.barcode,
        { warehouse_id: refs.warehouse.id, zone_id: refs.binZoneId, bin: 'NO-SUCH-SHELF' },
        refs.userId,
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects relocating an asset that does not exist', async () => {
    await expect(
      updateAssetLocation(
        'DOES-NOT-EXIST',
        { warehouse_id: refs.warehouse.id, zone_id: refs.binZoneId, bin: '' },
        refs.userId,
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects relocating into a zone that does not exist', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(
      updateAssetLocation(
        asset.barcode,
        { warehouse_id: refs.warehouse.id, zone_id: MISSING_ID, bin: '' },
        refs.userId,
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects relocating into a warehouse that does not exist', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(
      updateAssetLocation(
        asset.barcode,
        { warehouse_id: MISSING_ID, zone_id: refs.binZoneId, bin: '' },
        refs.userId,
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects relocating an asset that is in transit', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    await createShelf(refs, 'A1')
    const transferNumber = await createTransfer(
      buildCreateTransferInput(refs, [asset]),
      refs.userId,
    )
    await dispatchTransfer(transferNumber, refs.userId)

    await expect(
      updateAssetLocation(asset.barcode, shelf(refs, 'A1'), refs.userId),
    ).rejects.toThrow(ConflictError)
  })

  describe('bulkUpdateAssetLocation', () => {
    it('relocates every asset and records one history entry each', async () => {
      const assets = await createArrivedAssets(refs, 3)
      await createShelf(refs, 'A1')
      const sinceId = await getMaxHistoryId()

      await bulkUpdateAssetLocation(
        { ...shelf(refs, 'A1'), barcodes: assets.map((a) => a.barcode) },
        refs.userId,
      )

      const assetIds = assets.map((a) => a.id)
      expect(await binsOf(assetIds)).toEqual(['A1', 'A1', 'A1'])
      expect(await locationHistoryCount(sinceId, assetIds)).toBe(3)
    })

    it('moves nothing when one barcode does not exist', async () => {
      const assets = await createArrivedAssets(refs, 2)
      await createShelf(refs, 'A1')

      await expect(
        bulkUpdateAssetLocation(
          { ...shelf(refs, 'A1'), barcodes: [...assets.map((a) => a.barcode), 'DOES-NOT-EXIST'] },
          refs.userId,
        ),
      ).rejects.toThrow(NotFoundError)

      const bins = await binsOf(assets.map((a) => a.id))
      expect(bins).not.toContain('A1')
    })

    it('moves nothing when one asset is in transit', async () => {
      const assets = await createArrivedAssets(refs, 2)
      await createShelf(refs, 'A1')
      const transferNumber = await createTransfer(
        buildCreateTransferInput(refs, [assets[1]]),
        refs.userId,
      )
      await dispatchTransfer(transferNumber, refs.userId)

      await expect(
        bulkUpdateAssetLocation(
          { ...shelf(refs, 'A1'), barcodes: assets.map((a) => a.barcode) },
          refs.userId,
        ),
      ).rejects.toThrow(ConflictError)

      const bins = await binsOf(assets.map((a) => a.id))
      expect(bins).not.toContain('A1')
    })

    it('rejects a shelf that does not exist', async () => {
      const assets = await createArrivedAssets(refs, 2)

      await expect(
        bulkUpdateAssetLocation(
          { ...shelf(refs, 'NO-SUCH-SHELF'), barcodes: assets.map((a) => a.barcode) },
          refs.userId,
        ),
      ).rejects.toThrow(NotFoundError)
    })

    it('skips history for an asset already on the shelf', async () => {
      const assets = await createArrivedAssets(refs, 2)
      await createShelf(refs, 'A1')
      await updateAssetLocation(assets[0].barcode, shelf(refs, 'A1'), refs.userId)
      const sinceId = await getMaxHistoryId()

      await bulkUpdateAssetLocation(
        { ...shelf(refs, 'A1'), barcodes: assets.map((a) => a.barcode) },
        refs.userId,
      )

      const assetIds = assets.map((a) => a.id)
      expect(await binsOf(assetIds)).toEqual(['A1', 'A1'])
      expect(await locationHistoryCount(sinceId, assetIds)).toBe(1)
    })
  })
})
