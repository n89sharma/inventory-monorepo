import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalRefs,
  cleanupTransactionalData,
  createArrivedAssets,
  seedBrand,
  seedError,
  seedReferenceData,
} from '../../test/factories.js'
import { ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { updateAssetErrors } from './assetErrorService.js'

const MISSING_ID = 999999

describe('assetErrorService', () => {
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

  it('creates asset error rows for the supplied errors', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const errorId = await seedError(refs.brandId, 'E100')

    await updateAssetErrors(
      asset.barcode,
      { errors: [{ error_id: errorId, is_fixed: false }] },
      refs.userId,
    )

    const rows = await prisma.assetError.findMany({ where: { asset_id: asset.id } })
    expect(rows).toHaveLength(1)
    expect(rows[0].error_id).toBe(errorId)
    expect(rows[0].is_fixed).toBe(false)
  })

  it('removes asset errors absent from the next set', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const errorId = await seedError(refs.brandId, 'E100')
    await updateAssetErrors(
      asset.barcode,
      { errors: [{ error_id: errorId, is_fixed: false }] },
      refs.userId,
    )

    await updateAssetErrors(asset.barcode, { errors: [] }, refs.userId)

    const rows = await prisma.assetError.findMany({ where: { asset_id: asset.id } })
    expect(rows).toHaveLength(0)
  })

  it('stamps fixed_at/fixed_by when an error is marked fixed', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const errorId = await seedError(refs.brandId, 'E100')
    await updateAssetErrors(
      asset.barcode,
      { errors: [{ error_id: errorId, is_fixed: false }] },
      refs.userId,
    )

    await updateAssetErrors(
      asset.barcode,
      { errors: [{ error_id: errorId, is_fixed: true }] },
      refs.userId,
    )

    const row = await prisma.assetError.findFirstOrThrow({
      where: { asset_id: asset.id, error_id: errorId },
      select: { is_fixed: true, fixed_at: true, fixed_by: true },
    })
    expect(row.is_fixed).toBe(true)
    expect(row.fixed_at).not.toBeNull()
    expect(row.fixed_by).toBe(refs.userId)
  })

  it('rejects an error id belonging to a different brand', async () => {
    const [asset] = await createArrivedAssets(refs, 1)
    const otherBrandId = await seedBrand('Xerox')
    const wrongBrandErrorId = await seedError(otherBrandId, 'E200')

    await expect(
      updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: wrongBrandErrorId, is_fixed: false }] },
        refs.userId,
      ),
    ).rejects.toThrow(ValidationError)
  })

  it('rejects an unknown error id', async () => {
    const [asset] = await createArrivedAssets(refs, 1)

    await expect(
      updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: MISSING_ID, is_fixed: false }] },
        refs.userId,
      ),
    ).rejects.toThrow(ValidationError)
  })
})
