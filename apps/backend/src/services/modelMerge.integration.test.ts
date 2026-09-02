import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createBrand } from './brandService.js'
import { createModel, mergeModels, previewModelMerge } from './modelService.js'

const NAME_PREFIX = 'modelmerge-'

let brandId: number
let otherBrandId: number
let assetTypeId: number
let statusId: number
let readinessId: number

async function cleanupMergeData(): Promise<void> {
  await prisma.asset.deleteMany({ where: { barcode: { startsWith: NAME_PREFIX } } })
  await prisma.model.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

// Brands outlive the per-test cleanup and their names are unique, so the suite clears its own
// leftovers on the way in as well as on the way out. A run that dies mid-way cannot wedge the next.
async function cleanupBrands(): Promise<void> {
  await cleanupMergeData()
  await prisma.brand.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

function modelBody(name: string, brand = brandId) {
  return { name, weight: 1, size: 1, brand_id: brand, asset_type_id: assetTypeId, is_colour: false }
}

async function seedAssets(modelId: number, count: number, tag: string): Promise<void> {
  for (let index = 0; index < count; index++) {
    await prisma.asset.create({
      data: {
        barcode: `${NAME_PREFIX}${tag}-${index}`,
        serial_number: `${NAME_PREFIX}${tag}-${index}`,
        model_id: modelId,
        status_id: statusId,
        readiness_id: readinessId,
        created_at: new Date(),
      },
    })
  }
}

describe('model merge', () => {
  beforeAll(async () => {
    await cleanupBrands()
    assetTypeId = (await prisma.assetType.findFirstOrThrow({ where: { asset_type: 'Copier' } })).id
    statusId = (await prisma.status.findFirstOrThrow()).id
    readinessId = (await prisma.readiness.findFirstOrThrow()).id
    brandId = (await createBrand({ name: `${NAME_PREFIX}brand-a` })).id
    otherBrandId = (await createBrand({ name: `${NAME_PREFIX}brand-b` })).id
  })

  afterEach(cleanupMergeData)

  afterAll(cleanupBrands)

  it('keeps the model with the most assets and repoints the rest onto it', async () => {
    const big = await createModel(modelBody(`${NAME_PREFIX}IRADX 4745i`))
    const small = await createModel(modelBody(`${NAME_PREFIX}IRADX-4745`))
    await seedAssets(big.id, 3, 'big')
    await seedAssets(small.id, 1, 'small')

    const merged = await mergeModels([small.id, big.id], modelBody(`${NAME_PREFIX}IRADX 4745i`))

    expect(merged.id).toBe(big.id)
    expect(await prisma.asset.count({ where: { model_id: big.id } })).toBe(4)
    expect(await prisma.model.findUnique({ where: { id: small.id } })).toBeNull()
  })

  it('writes the submitted values onto the surviving model', async () => {
    const first = await createModel(modelBody(`${NAME_PREFIX}alpha`))
    const second = await createModel(modelBody(`${NAME_PREFIX}alpha two`))

    const merged = await mergeModels([first.id, second.id], {
      ...modelBody(`${NAME_PREFIX}alpha`),
      weight: 42,
      is_colour: true,
    })

    const survivor = await prisma.model.findUniqueOrThrow({ where: { id: merged.id } })
    expect(survivor.name).toBe(`${NAME_PREFIX}alpha`)
    expect(survivor.weight).toBe(42)
    expect(survivor.is_colour).toBe(true)
  })

  it('accepts the name of a model being merged', async () => {
    const first = await createModel(modelBody(`${NAME_PREFIX}beta`))
    const second = await createModel(modelBody(`${NAME_PREFIX}beta plus`))

    await expect(
      mergeModels([first.id, second.id], modelBody(`${NAME_PREFIX}beta`)),
    ).resolves.toEqual({ id: expect.any(Number) })
  })

  it('can merge models across brands, moving the assets to the surviving brand', async () => {
    const first = await createModel(modelBody(`${NAME_PREFIX}gamma`, brandId))
    const second = await createModel(modelBody(`${NAME_PREFIX}gamma`, otherBrandId))
    await seedAssets(second.id, 2, 'g')

    const merged = await mergeModels(
      [first.id, second.id],
      modelBody(`${NAME_PREFIX}gamma`, otherBrandId),
    )

    const survivor = await prisma.model.findUniqueOrThrow({ where: { id: merged.id } })
    expect(survivor.brand_id).toBe(otherBrandId)
    expect(await prisma.asset.count({ where: { model_id: merged.id } })).toBe(2)
  })

  it('rejects a name already held by a model outside the merge on the same brand', async () => {
    const first = await createModel(modelBody(`${NAME_PREFIX}delta`))
    const second = await createModel(modelBody(`${NAME_PREFIX}delta two`))
    await createModel(modelBody(`${NAME_PREFIX}taken`))

    await expect(
      mergeModels([first.id, second.id], modelBody(`${NAME_PREFIX}taken`)),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('reports the winner and each model asset count before merging', async () => {
    const big = await createModel(modelBody(`${NAME_PREFIX}epsilon`))
    const small = await createModel(modelBody(`${NAME_PREFIX}epsilon two`))
    await seedAssets(big.id, 2, 'e')

    const preview = await previewModelMerge([small.id, big.id])

    expect(preview.winner_id).toBe(big.id)
    expect(preview.candidates[0]).toMatchObject({ id: big.id, reference_count: 2 })
    expect(preview.candidates[1]).toMatchObject({ id: small.id, reference_count: 0 })
  })

  it('throws NotFoundError when one of the models is already gone', async () => {
    const only = await createModel(modelBody(`${NAME_PREFIX}zeta`))

    await expect(
      mergeModels([only.id, -1], modelBody(`${NAME_PREFIX}zeta`)),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('leaves every model and asset in place when the merge fails', async () => {
    const first = await createModel(modelBody(`${NAME_PREFIX}eta`))
    const second = await createModel(modelBody(`${NAME_PREFIX}eta two`))
    await createModel(modelBody(`${NAME_PREFIX}blocked`))
    await seedAssets(second.id, 1, 'h')

    await expect(
      mergeModels([first.id, second.id], modelBody(`${NAME_PREFIX}blocked`)),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(await prisma.model.findUnique({ where: { id: first.id } })).not.toBeNull()
    expect(await prisma.model.findUnique({ where: { id: second.id } })).not.toBeNull()
    expect(await prisma.asset.count({ where: { model_id: second.id } })).toBe(1)
  })
})
