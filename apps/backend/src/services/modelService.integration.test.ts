import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createBrand } from './brandService.js'
import { createModel, getModelSummary, updateModel } from './modelService.js'

const NAME_PREFIX = 'modelsvc-'

let brandId: number
let otherBrandId: number
let assetTypeId: number

async function cleanupModels(): Promise<void> {
  await prisma.model.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

function modelBody(name: string, brand: number) {
  return { name, weight: 1, size: 1, brand_id: brand, asset_type_id: assetTypeId, is_colour: false }
}

describe('modelService', () => {
  beforeAll(async () => {
    const assetType = await prisma.assetType.findFirstOrThrow({ where: { asset_type: 'Copier' } })
    assetTypeId = assetType.id
    brandId = (await createBrand({ name: `${NAME_PREFIX}brand-a` })).id
    otherBrandId = (await createBrand({ name: `${NAME_PREFIX}brand-b` })).id
  })

  afterEach(cleanupModels)

  // The seeded brands outlive the per-test model cleanup, and brand names are unique, so a
  // second run would collide in beforeAll without this.
  afterAll(async () => {
    await cleanupModels()
    await prisma.brand.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
  })

  it('updates a model', async () => {
    const { id } = await createModel(modelBody(`${NAME_PREFIX}imagepress`, brandId))

    await updateModel(id, {
      ...modelBody(`${NAME_PREFIX}imagepress-c1`, brandId),
      weight: 5,
      is_colour: true,
    })

    const model = await prisma.model.findUniqueOrThrow({ where: { id } })
    expect(model.name).toBe(`${NAME_PREFIX}imagepress-c1`)
    expect(model.weight).toBe(5)
    expect(model.is_colour).toBe(true)
  })

  it('rejects a rename onto an existing model of the same brand', async () => {
    await createModel(modelBody(`${NAME_PREFIX}taken`, brandId))
    const { id } = await createModel(modelBody(`${NAME_PREFIX}other`, brandId))

    await expect(updateModel(id, modelBody(`${NAME_PREFIX}taken`, brandId))).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects a case or punctuation variant within a brand', async () => {
    await createModel(modelBody(`${NAME_PREFIX}IRADX 4745i`, brandId))

    await expect(
      createModel(modelBody(`${NAME_PREFIX}iradx-4745i`, brandId)),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('keeps `+` significant, so IMAGEPRESS-C1 and IMAGEPRESS-C1+ coexist', async () => {
    await createModel(modelBody(`${NAME_PREFIX}IMAGEPRESS-C1`, brandId))

    const { id } = await createModel(modelBody(`${NAME_PREFIX}IMAGEPRESS-C1+`, brandId))

    const model = await prisma.model.findUniqueOrThrow({ where: { id } })
    expect(model.name).toBe(`${NAME_PREFIX}IMAGEPRESS-C1+`)
  })

  it('allows the same model name under a different brand', async () => {
    await createModel(modelBody(`${NAME_PREFIX}shared`, brandId))

    const { id } = await createModel(modelBody(`${NAME_PREFIX}shared`, otherBrandId))

    const model = await prisma.model.findUniqueOrThrow({ where: { id } })
    expect(model.brand_id).toBe(otherBrandId)
  })

  it('allows saving a model under its own unchanged name', async () => {
    const body = modelBody(`${NAME_PREFIX}unchanged`, brandId)
    const { id } = await createModel(body)

    await expect(updateModel(id, body)).resolves.toBeUndefined()
  })

  it('throws NotFoundError for an unknown id', async () => {
    await expect(updateModel(-1, modelBody(`${NAME_PREFIX}ghost`, brandId))).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('returns asset_type_id in the summary, which the edit form prefills from', async () => {
    const { id } = await createModel(modelBody(`${NAME_PREFIX}summary`, brandId))

    const summary = await getModelSummary(id)

    expect(summary.asset_type_id).toBe(assetTypeId)
    expect(summary.model_name).toBe(`${NAME_PREFIX}summary`)
  })
})
