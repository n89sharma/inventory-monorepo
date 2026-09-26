import { MAX_MODEL_FILTER_COUNT, ModelSummary } from 'shared-types'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  ALL_PRICE_PERMISSIONS,
  ArrivalTestData,
  cleanupTransactionalData,
  createArrivedAssets,
  seedArrivalTestData,
  seedModel,
} from '../../test/factories.js'
import { SearchOnHandQuerySchema } from '../controllers/assetController.js'
import { getAssetsForSearchOnHand } from './assetReadService.js'

const NAME_VARIANT_MODEL = 'IRADX4745iF'
const SIBLING_MODEL = 'IRADX4725i'
const SEEDED_MODEL_QUERY = 'IRADX4745'

describe('assetReadService model filter', () => {
  let refs: ArrivalTestData
  let variantModel: ModelSummary
  let siblingModel: ModelSummary

  function withModel(id: number, name: string): ModelSummary {
    return { ...refs.model, id, model_name: name }
  }

  async function searchOnHand(model: string, modelIds: number[]): Promise<string[]> {
    const rows = await getAssetsForSearchOnHand(
      [refs.warehouse.id],
      [],
      [],
      [],
      model,
      modelIds,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      -1,
      ALL_PRICE_PERMISSIONS,
    )
    return rows.map((r) => r.model).sort()
  }

  beforeAll(async () => {
    refs = await seedArrivalTestData()
    variantModel = withModel(
      await seedModel(refs.brandId, NAME_VARIANT_MODEL, false),
      NAME_VARIANT_MODEL,
    )
    siblingModel = withModel(await seedModel(refs.brandId, SIBLING_MODEL, false), SIBLING_MODEL)
  })

  afterEach(async () => {
    await cleanupTransactionalData()
  })

  afterAll(async () => {
    await cleanupTransactionalData()
  })

  async function arriveOneOfEachModel() {
    await createArrivedAssets(refs, 1)
    await createArrivedAssets({ ...refs, model: variantModel }, 1)
    await createArrivedAssets({ ...refs, model: siblingModel }, 1)
  }

  it('matches a picked model exactly, excluding models whose name contains it', async () => {
    await arriveOneOfEachModel()

    expect(await searchOnHand('', [refs.model.id])).toEqual([refs.model.model_name])
  })

  it('matches every picked model', async () => {
    await arriveOneOfEachModel()

    expect(await searchOnHand('', [refs.model.id, siblingModel.id])).toEqual(
      [refs.model.model_name, SIBLING_MODEL].sort(),
    )
  })

  it('applies no model filter when nothing is picked or typed', async () => {
    await arriveOneOfEachModel()

    expect(await searchOnHand('', [])).toHaveLength(3)
  })

  it('keeps substring matching for typed text', async () => {
    await arriveOneOfEachModel()

    expect(await searchOnHand(SEEDED_MODEL_QUERY, [])).toEqual(
      [refs.model.model_name, NAME_VARIANT_MODEL].sort(),
    )
  })

  it(`rejects more than ${MAX_MODEL_FILTER_COUNT} picked models`, () => {
    const modelIds = Array.from({ length: MAX_MODEL_FILTER_COUNT + 1 }, (_, i) => String(i + 1))

    const result = SearchOnHandQuerySchema.safeParse({ warehouseIds: ['1'], modelIds })

    expect(result.success).toBe(false)
  })
})
