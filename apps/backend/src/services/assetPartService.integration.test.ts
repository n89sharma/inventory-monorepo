import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
} from '../../test/factories.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createAssetSalvagedPart } from './assetPartService.js'

describe('assetPartService', () => {
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

  it('records a salvaged part fixed by the creator', async () => {
    const [recipient, donor] = await createArrivedAssets(refs, 2)

    await createAssetSalvagedPart(
      recipient.barcode,
      { donor_barcode: donor.barcode, part: 'Fuser', is_exchange: false },
      refs.userId,
    )

    const row = await prisma.assetSalvagedPart.findFirstOrThrow({
      where: { recipient_asset_id: recipient.id },
      select: { donor_asset_id: true, part: true, fixed_by: true },
    })
    expect(row.donor_asset_id).toBe(donor.id)
    expect(row.part).toBe('Fuser')
    expect(row.fixed_by).toBe(refs.userId)
  })

  it('records the part added on the recipient and harvested on the donor', async () => {
    const [recipient, donor] = await createArrivedAssets(refs, 2)
    const { _max } = await prisma.history.aggregate({ _max: { id: true } })

    await createAssetSalvagedPart(
      recipient.barcode,
      { donor_barcode: donor.barcode, part: 'Fuser', is_exchange: true },
      refs.userId,
    )

    const rows = await prisma.history.findMany({
      where: { id: { gt: _max.id ?? 0 }, entity_type: 'Asset' },
      select: { entity_id: true, action_type: true, changes: true },
      orderBy: { id: 'asc' },
    })
    expect(rows).toEqual([
      {
        entity_id: recipient.id,
        action_type: 'PART_ADDED',
        changes: {
          source: 'harvested',
          part: 'Fuser',
          donor_barcode: donor.barcode,
          is_exchange: true,
        },
      },
      {
        entity_id: donor.id,
        action_type: 'PART_HARVESTED',
        changes: { part: 'Fuser', recipient_barcode: recipient.barcode, is_exchange: true },
      },
    ])
  })

  it('rejects a salvaged part whose donor is the recipient', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(
      createAssetSalvagedPart(
        asset.barcode,
        { donor_barcode: asset.barcode, part: 'Fuser', is_exchange: false },
        refs.userId,
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects a salvaged part when the recipient does not exist', async () => {
    const [donor] = await createArrivedAssets(refs, 1)

    await expect(
      createAssetSalvagedPart(
        'DOES-NOT-EXIST',
        { donor_barcode: donor.barcode, part: 'Fuser', is_exchange: false },
        refs.userId,
      ),
    ).rejects.toThrow(NotFoundError)
  })

  it('rejects a salvaged part when the donor does not exist', async () => {
    const [recipient] = await createArrivedAssets(refs, 1)

    await expect(
      createAssetSalvagedPart(
        recipient.barcode,
        { donor_barcode: 'DOES-NOT-EXIST', part: 'Fuser', is_exchange: false },
        refs.userId,
      ),
    ).rejects.toThrow(NotFoundError)
  })
})
