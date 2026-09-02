import { ASSET_STATUS } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildCreateArrivalInput,
  cleanupTransactionalData,
  assetCostOf,
  ALL_PRICE_PERMISSIONS,
  NO_PERMISSIONS,
  SALE_PRICE_ONLY,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createArrival, deleteArrival, getArrival, moveAssetsToArrival } from './arrivalService.js'
import { deleteAsset } from './assetDeleteService.js'

async function getArrivalId(arrivalNumber: string): Promise<number> {
  const arrival = await prisma.arrival.findUniqueOrThrow({
    where: { arrival_number: arrivalNumber },
    select: { id: true },
  })
  return arrival.id
}

async function getArrivalAssetIds(arrivalNumber: string): Promise<number[]> {
  const assets = await prisma.asset.findMany({
    where: { arrival: { arrival_number: arrivalNumber } },
    select: { id: true },
  })
  return assets.map((a) => a.id)
}

async function getAssetArrivalId(assetId: number): Promise<number | null> {
  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { arrival_id: true },
  })
  return asset.arrival_id
}

async function getMaxHistoryId(): Promise<number> {
  const { _max } = await prisma.history.aggregate({ _max: { id: true } })
  return _max.id ?? 0
}

describe('createArrival', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('sets every arrived asset to IN_STOCK', async () => {
    const input = buildCreateArrivalInput(refs)
    const arrivalNumber = await createArrival(input, refs.userId)

    const assets = await prisma.asset.findMany({
      where: { arrival: { arrival_number: arrivalNumber } },
      select: { status: { select: { status: true } } },
    })

    expect(assets).toHaveLength(input.assets.length)
    expect(assets.every((a) => a.status.status === ASSET_STATUS.IN_STOCK)).toBe(true)
  })

  it('numbers the arrival A-<cityCode>-<7-digit sequence>', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    expect(arrivalNumber).toMatch(/^A-YYZ-\d{7}$/)
  })

  it('barcodes each asset <cityCode>-<7-digit sequence>', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const assets = await prisma.asset.findMany({
      where: { arrival: { arrival_number: arrivalNumber } },
      select: { barcode: true },
    })
    expect(assets).toHaveLength(1)
    expect(assets[0].barcode).toMatch(/^YYZ-\d{7}$/)
  })
})

describe('moveAssetsToArrival', () => {
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

  it('reassigns moved assets to the destination and leaves the rest on the source', async () => {
    const source = await createArrival(buildCreateArrivalInput(refs, 2), refs.userId)
    const destination = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const [moved, stays] = await getArrivalAssetIds(source)
    const destinationId = await getArrivalId(destination)
    const sourceId = await getArrivalId(source)

    await moveAssetsToArrival(source, destination, [moved], refs.userId)

    expect(await getAssetArrivalId(moved)).toBe(destinationId)
    expect(await getAssetArrivalId(stays)).toBe(sourceId)
    expect(await getArrivalAssetIds(destination)).toHaveLength(2)
  })

  it('records history for the moved assets', async () => {
    const source = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const destination = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const [moved] = await getArrivalAssetIds(source)
    const beforeMove = await getMaxHistoryId()

    await moveAssetsToArrival(source, destination, [moved], refs.userId)

    expect(await getMaxHistoryId()).toBeGreaterThan(beforeMove)
  })

  it('rejects moving assets to the same arrival', async () => {
    const source = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const [asset] = await getArrivalAssetIds(source)

    await expect(moveAssetsToArrival(source, source, [asset], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('rejects moving an asset that is not on the source arrival', async () => {
    const source = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const destination = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const [foreign] = await getArrivalAssetIds(destination)

    await expect(moveAssetsToArrival(source, destination, [foreign], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })
})

describe('getArrival', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('returns asset cost, redacted by role permissions', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const [assetId] = await getArrivalAssetIds(arrivalNumber)
    await seedAssetCost(assetId)

    const asAdmin = await getArrival(arrivalNumber, ALL_PRICE_PERMISSIONS)
    expect(assetCostOf(asAdmin.assets[0])).toEqual(SEEDED_ASSET_COST)

    const asSales = await getArrival(arrivalNumber, SALE_PRICE_ONLY)
    expect(assetCostOf(asSales.assets[0])).toEqual({
      ...REDACTED_ASSET_COST,
      sale_price: SEEDED_ASSET_COST.sale_price,
    })

    const asMember = await getArrival(arrivalNumber, NO_PERMISSIONS)
    expect(assetCostOf(asMember.assets[0])).toEqual(REDACTED_ASSET_COST)
  })

  it('returns a null-valued cost for an asset with no cost recorded', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)

    const arrival = await getArrival(arrivalNumber, ALL_PRICE_PERMISSIONS)
    expect(assetCostOf(arrival.assets[0])).toEqual(REDACTED_ASSET_COST)
  })
})

describe('deleteArrival', () => {
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

  it('deletes an arrival that holds no assets', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 1), refs.userId)
    const [assetId] = await getArrivalAssetIds(arrivalNumber)
    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: assetId },
      select: { barcode: true },
    })
    await deleteAsset(asset.barcode, refs.userId)

    await deleteArrival(arrivalNumber, refs.userId)

    expect(await prisma.arrival.findUnique({ where: { arrival_number: arrivalNumber } })).toBeNull()
  })

  it('refuses to delete an arrival that still holds assets', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs, 2), refs.userId)

    await expect(deleteArrival(arrivalNumber, refs.userId)).rejects.toThrow(
      new ConflictError(`Arrival ${arrivalNumber} cannot be deleted because it still has 2 assets`),
    )
    expect(
      await prisma.arrival.findUnique({ where: { arrival_number: arrivalNumber } }),
    ).not.toBeNull()
  })

  it('throws when the arrival number does not exist', async () => {
    await expect(deleteArrival('A-YYZ-9999999', refs.userId)).rejects.toThrow(NotFoundError)
  })
})
