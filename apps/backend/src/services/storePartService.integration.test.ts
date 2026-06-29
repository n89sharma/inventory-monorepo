import { AddPurchase, AddStorePartToAsset } from 'shared-types'
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
import { addPurchase, addStorePartToAsset, getStoreParts } from './storePartService.js'

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
    const purchase: AddPurchase = {
      part: { mode: 'new', part_number: partNumber, description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity,
      unit_cost: unitCost,
      notes: null,
    }
    await addPurchase(purchase, refs.userId)
    const part = await prisma.storePart.findUniqueOrThrow({
      where: { part_number: partNumber },
      select: { id: true },
    })
    return part.id
  }

  it('decrements on-hand and bumps asset parts_cost/total_cost when a part is consumed', async () => {
    const storePartId = await purchaseNewPart(10, 5)
    const [asset] = await createArrivedAssets(refs, 1)

    const consume: AddStorePartToAsset = {
      store_part_id: storePartId,
      warehouse_id: refs.warehouse.id,
      quantity: 3,
      unit_cost: 5,
    }
    await addStorePartToAsset(asset.barcode, consume, refs.userId)

    const cost = await getAssetCost(asset.id)
    expect(cost?.parts_cost).toBe(15)
    expect(cost?.total_cost).toBe(15)

    const onHandRow = (await getStoreParts()).find(
      (r) => r.id === storePartId && r.warehouse_id === refs.warehouse.id,
    )
    expect(onHandRow?.on_hand).toBe(7)
  })

  it('rejects consuming more of a part than is on hand', async () => {
    const storePartId = await purchaseNewPart(1, 5)
    const [asset] = await createArrivedAssets(refs, 1)

    const consume: AddStorePartToAsset = {
      store_part_id: storePartId,
      warehouse_id: refs.warehouse.id,
      quantity: 5,
      unit_cost: 5,
    }
    await expect(addStorePartToAsset(asset.barcode, consume, refs.userId)).rejects.toThrow(
      ConflictError,
    )
  })

  it('rejects creating a part whose part_number already exists', async () => {
    const partNumber = 'TEST-PART-DUP'
    const purchase: AddPurchase = {
      part: { mode: 'new', part_number: partNumber, description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity: 1,
      unit_cost: 5,
      notes: null,
    }
    await addPurchase(purchase, refs.userId)

    await expect(addPurchase(purchase, refs.userId)).rejects.toThrow(ConflictError)
  })

  it('numbers the store transaction S-<7-digit sequence>', async () => {
    const purchase: AddPurchase = {
      part: { mode: 'new', part_number: 'TEST-PART-NUM', description: 'Test part' },
      warehouse_id: refs.warehouse.id,
      quantity: 1,
      unit_cost: 5,
      notes: null,
    }
    const { store_transaction_number } = await addPurchase(purchase, refs.userId)
    expect(store_transaction_number).toMatch(/^S-\d{7}$/)
  })
})
