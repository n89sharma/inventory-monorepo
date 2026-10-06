import { ASSET_STATUS, searchRowToAssetSummary, type SplitArrival } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  buildAsset,
  buildCreateArrivalInput,
  buildCreateInvoiceInput,
  cleanupTransactionalData,
  createArrivalWithAssets,
  TEST_INVOICE_REFERENCE,
  assetCostOf,
  ALL_PRICE_PERMISSIONS,
  NO_PERMISSIONS,
  SALE_PRICE_ONLY,
  REDACTED_ASSET_COST,
  seedArrivalTestData,
  seedAssetCost,
  seedError,
  SEEDED_ASSET_COST,
} from '../../test/factories.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createArrival,
  createSingleArrivalAsset,
  deleteArrival,
  getArrival,
  getArrivalAssetForUpdate,
  moveAssetsToArrival,
  splitArrival,
  updateArrivalAsset,
} from './arrivalService.js'
import { deleteAsset } from './assetDeleteService.js'
import { createInvoice } from './invoiceService.js'

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

  it('creates an arrival with no assets', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs), refs.userId)

    expect(arrivalNumber).toMatch(/^A-YYZ-\d{7}$/)
    expect(await getArrivalAssetIds(arrivalNumber)).toEqual([])
  })
})

describe('createSingleArrivalAsset', () => {
  let refs: ArrivalTestData

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  it('arrives the asset IN_STOCK with a <cityCode>-<7-digit sequence> barcode', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs), refs.userId)

    const created = await createSingleArrivalAsset(arrivalNumber, buildAsset(refs), refs.userId)

    const asset = await prisma.asset.findUniqueOrThrow({
      where: { id: created.id },
      select: { barcode: true, status: { select: { status: true } } },
    })
    expect(asset.barcode).toMatch(/^YYZ-\d{7}$/)
    expect(asset.status.status).toBe(ASSET_STATUS.IN_STOCK)
  })

  it('stores the damage recorded on arrival, and no note on an undamaged asset', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs), refs.userId)
    const damaged = { ...buildAsset(refs), isDamaged: true, damageNotes: 'Dented side panel' }
    // A note typed before the box was unticked must not survive the write.
    const undamaged = { ...buildAsset(refs), damageNotes: 'Typed then withdrawn' }

    const createdDamaged = await createSingleArrivalAsset(arrivalNumber, damaged, refs.userId)
    const createdUndamaged = await createSingleArrivalAsset(arrivalNumber, undamaged, refs.userId)

    const assets = await prisma.asset.findMany({
      where: { id: { in: [createdDamaged.id, createdUndamaged.id] } },
      select: { id: true, is_damaged: true, damage_notes: true },
    })
    const byId = new Map(assets.map((a) => [a.id, a]))
    expect(byId.get(createdDamaged.id)).toMatchObject({
      is_damaged: true,
      damage_notes: 'Dented side panel',
    })
    expect(byId.get(createdUndamaged.id)).toMatchObject({ is_damaged: false, damage_notes: null })
  })

  it('reads the damage back onto the arrival detail rows', async () => {
    const arrivalNumber = await createArrival(buildCreateArrivalInput(refs), refs.userId)
    const damaged = { ...buildAsset(refs), isDamaged: true, damageNotes: 'Cracked glass' }
    await createSingleArrivalAsset(arrivalNumber, damaged, refs.userId)

    const { assets } = await getArrival(arrivalNumber, ALL_PRICE_PERMISSIONS)
    expect(assets[0]).toMatchObject({ is_damaged: true, damage_notes: 'Cracked glass' })
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
    const source = await createArrivalWithAssets(refs, 2)
    const destination = await createArrivalWithAssets(refs, 1)
    const [moved, stays] = await getArrivalAssetIds(source)
    const destinationId = await getArrivalId(destination)
    const sourceId = await getArrivalId(source)

    await moveAssetsToArrival(source, destination, [moved], refs.userId)

    expect(await getAssetArrivalId(moved)).toBe(destinationId)
    expect(await getAssetArrivalId(stays)).toBe(sourceId)
    expect(await getArrivalAssetIds(destination)).toHaveLength(2)
  })

  it('records history for the moved assets', async () => {
    const source = await createArrivalWithAssets(refs, 1)
    const destination = await createArrivalWithAssets(refs, 1)
    const [moved] = await getArrivalAssetIds(source)
    const beforeMove = await getMaxHistoryId()

    await moveAssetsToArrival(source, destination, [moved], refs.userId)

    expect(await getMaxHistoryId()).toBeGreaterThan(beforeMove)
  })

  it('rejects moving assets to the same arrival', async () => {
    const source = await createArrivalWithAssets(refs, 1)
    const [asset] = await getArrivalAssetIds(source)

    await expect(moveAssetsToArrival(source, source, [asset], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('rejects moving an asset that is not on the source arrival', async () => {
    const source = await createArrivalWithAssets(refs, 1)
    const destination = await createArrivalWithAssets(refs, 1)
    const [foreign] = await getArrivalAssetIds(destination)

    await expect(moveAssetsToArrival(source, destination, [foreign], refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })
})

describe('splitArrival', () => {
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

  it('creates the new arrival from the payload, in the source arrival warehouse', async () => {
    const source = await createArrivalWithAssets(refs, 2)
    const [moved] = await getArrivalAssetIds(source)

    const splitNumber = await splitArrival(source, buildSplitInput([moved]), refs.userId)

    const created = await prisma.arrival.findUniqueOrThrow({
      where: { arrival_number: splitNumber },
      select: { origin_id: true, destination_id: true, transporter_id: true, notes: true },
    })
    const sourceWarehouse = await prisma.arrival.findUniqueOrThrow({
      where: { arrival_number: source },
      select: { destination_id: true },
    })
    expect(splitNumber).toMatch(/^A-YYZ-\d{7}$/)
    expect(created).toMatchObject({
      origin_id: refs.customer.id,
      destination_id: sourceWarehouse.destination_id,
      transporter_id: refs.transporter.id,
      notes: 'Second vendor on the same truck',
    })
  })

  it('reassigns only the selected assets and leaves the rest on the source', async () => {
    const source = await createArrivalWithAssets(refs, 3)
    const [moved, stays] = await getArrivalAssetIds(source)
    const sourceId = await getArrivalId(source)

    const splitNumber = await splitArrival(source, buildSplitInput([moved]), refs.userId)

    expect(await getAssetArrivalId(moved)).toBe(await getArrivalId(splitNumber))
    expect(await getAssetArrivalId(stays)).toBe(sourceId)
    expect(await getArrivalAssetIds(source)).toHaveLength(2)
  })

  it('records history for the new arrival and the moved assets', async () => {
    const source = await createArrivalWithAssets(refs, 2)
    const [moved] = await getArrivalAssetIds(source)
    const beforeSplit = await getMaxHistoryId()

    await splitArrival(source, buildSplitInput([moved]), refs.userId)

    expect(await getMaxHistoryId()).toBeGreaterThan(beforeSplit)
  })

  it('rejects a split that would empty the source arrival', async () => {
    const source = await createArrivalWithAssets(refs, 2)
    const assetIds = await getArrivalAssetIds(source)

    await expect(splitArrival(source, buildSplitInput(assetIds), refs.userId)).rejects.toThrow(
      ConflictError,
    )
    expect(await getArrivalAssetIds(source)).toHaveLength(2)
  })

  it('rejects an asset that is not on the source arrival', async () => {
    const source = await createArrivalWithAssets(refs, 2)
    const other = await createArrivalWithAssets(refs, 2)
    const [foreign] = await getArrivalAssetIds(other)

    await expect(splitArrival(source, buildSplitInput([foreign]), refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('rejects a split of an arrival that does not exist', async () => {
    await expect(splitArrival('A-YYZ-9999999', buildSplitInput([1]), refs.userId)).rejects.toThrow(
      NotFoundError,
    )
  })

  function buildSplitInput(assetIds: number[]): SplitArrival {
    return {
      vendor: refs.customer,
      transporter: refs.transporter,
      comment: 'Second vendor on the same truck',
      assetIds,
    }
  }
})

describe('updateArrivalAsset', () => {
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

  it('records the errors added while editing the asset', async () => {
    const arrivalNumber = await createArrivalWithAssets(refs, 2)
    const [assetId] = await getArrivalAssetIds(arrivalNumber)
    const errorId = await seedError(refs.brandId, 'E100')
    const editable = await getArrivalAssetForUpdate(arrivalNumber, assetId!)
    const sinceId = await getMaxHistoryId()

    await updateArrivalAsset(
      arrivalNumber,
      assetId!,
      { ...editable, errors: [{ error_id: errorId, is_fixed: false }] },
      refs.userId,
    )

    const rows = await prisma.history.findMany({
      where: { id: { gt: sinceId }, entity_id: assetId, action_type: 'ERRORS_CHANGED' },
    })
    expect(rows.map((row) => row.changes)).toEqual([
      { added: ['E100'], fixed: [], reopened: [], removed: [] },
    ])
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
    const arrivalNumber = await createArrivalWithAssets(refs, 1)
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
    const arrivalNumber = await createArrivalWithAssets(refs, 1)

    const arrival = await getArrival(arrivalNumber, ALL_PRICE_PERMISSIONS)
    expect(assetCostOf(arrival.assets[0])).toEqual(REDACTED_ASSET_COST)
  })

  it('returns the purchase invoices of its assets with the invoiced vendor', async () => {
    const arrivalNumber = await createArrivalWithAssets(refs, 3)
    const { assets } = await getArrival(arrivalNumber, ALL_PRICE_PERMISSIONS)
    const [first, second] = assets.map(searchRowToAssetSummary)
    const { invoiceNumber } = await createInvoice(
      buildCreateInvoiceInput(refs, [first, second], refs.invoiceTypePurchaseId),
      refs.userId,
    )

    const arrival = await getArrival(arrivalNumber, ALL_PRICE_PERMISSIONS)

    // two invoiced assets collapse to one invoice; the uninvoiced third adds nothing
    expect(arrival.invoices).toEqual([
      {
        invoice_number: invoiceNumber,
        invoice_reference: TEST_INVOICE_REFERENCE,
        vendor_id: refs.customer.id,
        vendor: refs.customer.name,
      },
    ])
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
    const arrivalNumber = await createArrivalWithAssets(refs, 1)
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
    const arrivalNumber = await createArrivalWithAssets(refs, 2)

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
