import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ArrivalTestData,
  cleanupTransactionalData,
  seedArrivalTestData,
} from '../../test/factories.js'
import { NotFoundError } from '../lib/errors.js'
import { getWarehouseTransferCosts, updateWarehouseTransferCost } from './transferCostService.js'

const UNKNOWN_WAREHOUSE_ID = 999999

describe('transferCostService', () => {
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

  it('creates a row on the first save and updates it on the next', async () => {
    await updateWarehouseTransferCost(
      refs.warehouse.id,
      { transfer_cost: 10, processing_cost: 4, tested_processing_cost: 7, other_cost: 1 },
      refs.userId,
    )
    await updateWarehouseTransferCost(
      refs.warehouse.id,
      { transfer_cost: 12.5, processing_cost: 0, tested_processing_cost: 8.25, other_cost: 1 },
      refs.userId,
    )

    expect(await getWarehouseTransferCosts()).toEqual([
      {
        warehouse_id: refs.warehouse.id,
        transfer_cost: 12.5,
        processing_cost: 0,
        tested_processing_cost: 8.25,
        other_cost: 1,
      },
    ])
  })

  it('rejects an unknown warehouse', async () => {
    await expect(
      updateWarehouseTransferCost(
        UNKNOWN_WAREHOUSE_ID,
        { transfer_cost: 1, processing_cost: 1, tested_processing_cost: 1, other_cost: 1 },
        refs.userId,
      ),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('returns nothing when no warehouse has been configured', async () => {
    expect(await getWarehouseTransferCosts()).toEqual([])
  })
})
