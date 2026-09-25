import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
  seedBrand,
  seedError,
} from '../../test/factories.js'
import { ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { updateAssetErrors } from './assetErrorService.js'

const MISSING_ID = 999999
const OPEN = false
const FIXED = true

type ErrorsChangedRow = { added: string[]; fixed: string[]; reopened: string[]; removed: string[] }

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

async function assetHistorySince(sinceId: number, assetId: number, actionType: string) {
  return prisma.history.findMany({
    where: {
      id: { gt: sinceId },
      entity_type: 'Asset',
      entity_id: assetId,
      action_type: actionType,
    },
  })
}

async function errorsChangedSince(sinceId: number, assetId: number): Promise<ErrorsChangedRow[]> {
  const rows = await assetHistorySince(sinceId, assetId, 'ERRORS_CHANGED')
  return rows.map((row) => row.changes as ErrorsChangedRow)
}

describe('assetErrorService', () => {
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

  describe('history', () => {
    it('records an added open error under added only', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const errorId = await seedError(refs.brandId, 'E100')
      const sinceId = await getMaxHistoryId()

      await updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: errorId, is_fixed: OPEN }] },
        refs.userId,
      )

      expect(await errorsChangedSince(sinceId, asset.id)).toEqual([
        { added: ['E100'], fixed: [], reopened: [], removed: [] },
      ])
    })

    it('records marking an existing error fixed under fixed only', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const errorId = await seedError(refs.brandId, 'E100')
      const otherErrorId = await seedError(refs.brandId, 'E200')
      await updateAssetErrors(
        asset.barcode,
        {
          errors: [
            { error_id: errorId, is_fixed: OPEN },
            { error_id: otherErrorId, is_fixed: OPEN },
          ],
        },
        refs.userId,
      )
      const sinceId = await getMaxHistoryId()

      await updateAssetErrors(
        asset.barcode,
        {
          errors: [
            { error_id: errorId, is_fixed: FIXED },
            { error_id: otherErrorId, is_fixed: OPEN },
          ],
        },
        refs.userId,
      )

      expect(await errorsChangedSince(sinceId, asset.id)).toEqual([
        { added: [], fixed: ['E100'], reopened: [], removed: [] },
      ])
    })

    it('records reopening a fixed error under reopened', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const errorId = await seedError(refs.brandId, 'E100')
      await updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: errorId, is_fixed: FIXED }] },
        refs.userId,
      )
      const sinceId = await getMaxHistoryId()

      await updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: errorId, is_fixed: OPEN }] },
        refs.userId,
      )

      expect(await errorsChangedSince(sinceId, asset.id)).toEqual([
        { added: [], fixed: [], reopened: ['E100'], removed: [] },
      ])
    })

    it('records deleting an error under removed', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const errorId = await seedError(refs.brandId, 'E100')
      await updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: errorId, is_fixed: OPEN }] },
        refs.userId,
      )
      const sinceId = await getMaxHistoryId()

      await updateAssetErrors(asset.barcode, { errors: [] }, refs.userId)

      expect(await errorsChangedSince(sinceId, asset.id)).toEqual([
        { added: [], fixed: [], reopened: [], removed: ['E100'] },
      ])
    })

    it('writes no errors row when nothing changed', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const errorId = await seedError(refs.brandId, 'E100')
      const errors = [{ error_id: errorId, is_fixed: OPEN }]
      await updateAssetErrors(asset.barcode, { errors }, refs.userId)
      const sinceId = await getMaxHistoryId()

      await updateAssetErrors(asset.barcode, { errors }, refs.userId)

      expect(await errorsChangedSince(sinceId, asset.id)).toEqual([])
    })

    it('records the readiness release alongside fixing the last open error', async () => {
      const [asset] = await createArrivedAssets(refs, 1)
      const errorId = await seedError(refs.brandId, 'E100')
      await updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: errorId, is_fixed: OPEN }] },
        refs.userId,
      )
      const sinceId = await getMaxHistoryId()

      await updateAssetErrors(
        asset.barcode,
        { errors: [{ error_id: errorId, is_fixed: FIXED }] },
        refs.userId,
      )

      expect(await errorsChangedSince(sinceId, asset.id)).toHaveLength(1)
      const updates = await assetHistorySince(sinceId, asset.id, 'UPDATE')
      expect(updates.map((row) => row.changes)).toEqual([
        { before: { readiness: 'HAS_ERRORS' }, after: { readiness: 'PP_OK' } },
      ])
    })
  })
})
