import { RecordStoreTransaction, AddStorePartToAsset, RevalueStorePart } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  createArrivedAssets,
  getAssetCost,
  seedArrivalTestData,
} from '../../test/factories.js'
import { ConflictError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  recordStoreTransaction,
  addStorePartToAsset,
  getStoreParts,
  revalueStorePart,
} from './storePartService.js'

describe('storePartService', () => {
  let refs: ArrivalTestData
  let partCounter = 0

  beforeAll(async () => {
    refs = await seedArrivalTestData()
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  // Each test creates its own part so on-hand math is independent.
  async function purchaseNewPart(quantity: number, unitCost: number): Promise<number> {
    partCounter += 1
    const partNumber = `TEST-PART-${partCounter}`
    const purchase: RecordStoreTransaction = {
      kind: 'PURCHASE',
      part: { mode: 'new', part_number: partNumber, description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity,
      unit_cost: unitCost,
      notes: null,
    }
    await recordStoreTransaction(purchase, refs.userId)
    const part = await prisma.storePart.findUniqueOrThrow({
      where: { part_number: partNumber },
      select: { id: true },
    })
    return part.id
  }

  // A second (or later) purchase of the same part — a new FIFO layer behind the first.
  async function purchaseMore(
    storePartId: number,
    quantity: number,
    unitCost: number,
    warehouseId = refs.warehouse.id,
  ) {
    const purchase: RecordStoreTransaction = {
      kind: 'PURCHASE',
      part: { mode: 'existing', store_part_id: storePartId },
      warehouse_id: warehouseId,
      quantity,
      unit_cost: unitCost,
      notes: null,
    }
    await recordStoreTransaction(purchase, refs.userId)
  }

  async function summaryRow(
    storePartId: number,
    canViewCost = true,
    warehouseId = refs.warehouse.id,
  ) {
    const rows = await getStoreParts(canViewCost)
    return rows.find((r) => r.id === storePartId && r.warehouse_id === warehouseId)
  }

  async function revalue(storePartId: number, unitCost: number, warehouseId = refs.warehouse.id) {
    const revaluation: RevalueStorePart = {
      warehouse_id: warehouseId,
      unit_cost: unitCost,
      notes: null,
    }
    return revalueStorePart(storePartId, revaluation, refs.userId)
  }

  it('decrements on-hand and bumps asset parts_cost/total_cost when a part is consumed', async () => {
    const storePartId = await purchaseNewPart(10, 5)
    const [asset] = await createArrivedAssets(refs, 1)

    const consume: AddStorePartToAsset = {
      store_part_id: storePartId,
      warehouse_id: refs.warehouse.id,
      quantity: 3,
    }
    await addStorePartToAsset(asset.barcode, consume, refs.userId)

    const cost = await getAssetCost(asset.id)
    expect(cost?.parts_cost).toBe(15)
    expect(cost?.total_cost).toBe(15)

    expect((await summaryRow(storePartId))?.on_hand).toBe(7)
  })

  it('rejects consuming more of a part than is on hand', async () => {
    const storePartId = await purchaseNewPart(1, 5)
    const [asset] = await createArrivedAssets(refs, 1)

    const consume: AddStorePartToAsset = {
      store_part_id: storePartId,
      warehouse_id: refs.warehouse.id,
      quantity: 5,
    }
    await expect(addStorePartToAsset(asset.barcode, consume, refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('values stock on hand against the newest purchase', async () => {
    // 10 @ $10, then 10 @ $20, then 15 consumed — the 5 left are all from the $20 layer.
    const storePartId = await purchaseNewPart(10, 10)
    await purchaseMore(storePartId, 10, 20)
    const [asset] = await createArrivedAssets(refs, 1)
    await addStorePartToAsset(
      asset.barcode,
      { store_part_id: storePartId, warehouse_id: refs.warehouse.id, quantity: 15 },
      refs.userId,
    )

    const row = await summaryRow(storePartId)
    expect(row?.on_hand).toBe(5)
    expect(row?.stock_value).toBe(100)
  })

  it('costs a consumption that spans two purchases and records a blended unit cost', async () => {
    // 10 @ $10 then 10 @ $20, consume 15 → 10 x $10 + 5 x $20 = $200, blended $13.33.
    const storePartId = await purchaseNewPart(10, 10)
    await purchaseMore(storePartId, 10, 20)
    const [asset] = await createArrivedAssets(refs, 1)
    await addStorePartToAsset(
      asset.barcode,
      { store_part_id: storePartId, warehouse_id: refs.warehouse.id, quantity: 15 },
      refs.userId,
    )

    const cost = await getAssetCost(asset.id)
    expect(cost?.parts_cost).toBe(200)
    expect(cost?.total_cost).toBe(200)

    const used = await prisma.storeTransaction.findFirstOrThrow({
      where: { store_part_id: storePartId, transaction_type: { is_inbound: false } },
      select: { unit_cost: true },
    })
    expect(used.unit_cost?.toString()).toBe('13.33')
  })

  it('resumes the FIFO queue where the previous consumption stopped', async () => {
    const storePartId = await purchaseNewPart(10, 10)
    await purchaseMore(storePartId, 10, 20)
    const [first, second] = await createArrivedAssets(refs, 2)

    await addStorePartToAsset(
      first.barcode,
      { store_part_id: storePartId, warehouse_id: refs.warehouse.id, quantity: 15 },
      refs.userId,
    )
    await addStorePartToAsset(
      second.barcode,
      { store_part_id: storePartId, warehouse_id: refs.warehouse.id, quantity: 3 },
      refs.userId,
    )

    expect((await getAssetCost(second.id))?.parts_cost).toBe(60)
    expect((await summaryRow(storePartId))?.stock_value).toBe(40)
  })

  it('withholds stock value from callers who cannot view purchase prices', async () => {
    const storePartId = await purchaseNewPart(10, 10)

    expect((await summaryRow(storePartId, true))?.stock_value).toBe(100)
    expect((await summaryRow(storePartId, false))?.stock_value).toBeNull()
  })

  it('rejects creating a part whose part_number already exists', async () => {
    const partNumber = 'TEST-PART-DUP'
    const purchase: RecordStoreTransaction = {
      kind: 'PURCHASE',
      part: { mode: 'new', part_number: partNumber, description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity: 1,
      unit_cost: 5,
      notes: null,
    }
    await recordStoreTransaction(purchase, refs.userId)

    await expect(recordStoreTransaction(purchase, refs.userId)).rejects.toThrow(ConflictError)
  })

  it('numbers the store transaction S-<7-digit sequence>', async () => {
    const purchase: RecordStoreTransaction = {
      kind: 'PURCHASE',
      part: { mode: 'new', part_number: 'TEST-PART-NUM', description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity: 1,
      unit_cost: 5,
      notes: null,
    }
    const { store_transaction_number } = await recordStoreTransaction(purchase, refs.userId)
    expect(store_transaction_number).toMatch(/^S-\d{7}$/)
  })

  it('deducts on-hand when a SALE is recorded', async () => {
    const storePartId = await purchaseNewPart(10, 5)

    const sale: RecordStoreTransaction = {
      kind: 'SALE',
      part: { mode: 'existing', store_part_id: storePartId },
      warehouse_id: refs.warehouse.id,
      quantity: 4,
      unit_cost: 8,
      notes: null,
    }
    await recordStoreTransaction(sale, refs.userId)

    expect((await summaryRow(storePartId))?.on_hand).toBe(6)
  })

  it('rejects a SALE that exceeds on-hand', async () => {
    const storePartId = await purchaseNewPart(2, 5)

    const sale: RecordStoreTransaction = {
      kind: 'SALE',
      part: { mode: 'existing', store_part_id: storePartId },
      warehouse_id: refs.warehouse.id,
      quantity: 5,
      unit_cost: 8,
      notes: null,
    }
    await expect(recordStoreTransaction(sale, refs.userId)).rejects.toThrow(ConflictError)
  })

  it('revalues stock on hand without moving any of it', async () => {
    const storePartId = await purchaseNewPart(10, 10)

    await revalue(storePartId, 4)

    const row = await summaryRow(storePartId)
    expect(row?.on_hand).toBe(10)
    expect(row?.stock_value).toBe(40)
  })

  it('revalues upward as readily as downward', async () => {
    const storePartId = await purchaseNewPart(10, 10)

    await revalue(storePartId, 15)

    expect((await summaryRow(storePartId))?.stock_value).toBe(150)
  })

  it('writes a clearing leg at the old price and a restating leg at the new one', async () => {
    const storePartId = await purchaseNewPart(10, 10)

    const { store_transaction_number } = await revalue(storePartId, 4)

    const legs = await prisma.storeTransaction.findMany({
      where: {
        store_part_id: storePartId,
        transaction_type: { type: { in: ['REVALUATION_OUT', 'REVALUATION_IN'] } },
      },
      orderBy: { id: 'asc' },
      select: {
        store_transaction_number: true,
        quantity: true,
        unit_cost: true,
        transaction_type: { select: { type: true, is_inbound: true } },
      },
    })

    expect(legs).toHaveLength(2)
    expect(legs[0].transaction_type).toEqual({ type: 'REVALUATION_OUT', is_inbound: false })
    expect(legs[0].quantity).toBe(10)
    expect(legs[0].unit_cost?.toNumber()).toBe(10)
    expect(legs[1].transaction_type).toEqual({ type: 'REVALUATION_IN', is_inbound: true })
    expect(legs[1].quantity).toBe(10)
    expect(legs[1].unit_cost?.toNumber()).toBe(4)
    // The restating leg is the one that carries the new value, so it is the number returned.
    expect(store_transaction_number).toBe(legs[1].store_transaction_number)
  })

  it('leaves stock bought after a revaluation at the price actually paid', async () => {
    // The whole point of revaluing as a ledger event: it applies to the stock held at
    // the time, not to everything the part will ever hold.
    const storePartId = await purchaseNewPart(10, 10)
    await revalue(storePartId, 4)
    await purchaseMore(storePartId, 5, 12)

    const row = await summaryRow(storePartId)
    expect(row?.on_hand).toBe(15)
    expect(row?.stock_value).toBe(10 * 4 + 5 * 12)
  })

  it('charges the revalued price when the part is consumed onto an asset', async () => {
    const storePartId = await purchaseNewPart(10, 10)
    await revalue(storePartId, 4)
    const [asset] = await createArrivedAssets(refs, 1)

    await addStorePartToAsset(
      asset.barcode,
      { store_part_id: storePartId, warehouse_id: refs.warehouse.id, quantity: 3 },
      refs.userId,
    )

    expect((await getAssetCost(asset.id))?.parts_cost).toBe(12)
    expect((await summaryRow(storePartId))?.stock_value).toBe(28)
  })

  it('revalues one warehouse without touching another', async () => {
    const storePartId = await purchaseNewPart(10, 10)
    await purchaseMore(storePartId, 4, 25, refs.warehouse2.id)

    await revalue(storePartId, 4)

    expect((await summaryRow(storePartId))?.stock_value).toBe(40)
    expect((await summaryRow(storePartId, true, refs.warehouse2.id))?.stock_value).toBe(100)
  })

  it('rejects revaluing a warehouse that holds none of the part', async () => {
    const storePartId = await purchaseNewPart(10, 10)

    await expect(revalue(storePartId, 4, refs.warehouse2.id)).rejects.toThrow(ConflictError)
  })
})
