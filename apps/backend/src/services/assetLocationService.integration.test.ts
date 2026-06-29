import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  cleanupTransactionalData,
  createArrivedAssets,
  seedReferenceData,
} from '../../test/factories.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { updateAssetLocation } from './assetLocationService.js'

const MISSING_ID = 999999

describe('assetLocationService', () => {
  let refs: ArrivalRefs

  beforeAll(async () => {
    refs = await seedReferenceData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('honors the bin value when relocating into the BIN zone', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await updateAssetLocation(
      asset.barcode,
      { warehouse_id: refs.warehouse.id, zone_id: refs.binZoneId, bin: 'A1' },
      refs.userId,
    )

    const row = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { location: { select: { bin: true, zone_id: true } } },
    })
    expect(row.location?.zone_id).toBe(refs.binZoneId)
    expect(row.location?.bin).toBe('A1')
  })

  it('forces an empty bin for non-BIN zones', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await updateAssetLocation(
      asset.barcode,
      { warehouse_id: refs.warehouse.id, zone_id: refs.arrivalZoneId, bin: 'A1' },
      refs.userId,
    )

    const row = await prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      select: { location: { select: { bin: true, zone_id: true } } },
    })
    expect(row.location?.zone_id).toBe(refs.arrivalZoneId)
    expect(row.location?.bin).toBe('')
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
})
