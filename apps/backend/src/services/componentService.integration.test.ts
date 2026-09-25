import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createBrand } from './brandService.js'
import {
  createComponent,
  listComponents,
  mergeComponents,
  previewComponentMerge,
  updateComponent,
} from './componentService.js'
import { createModel } from './modelService.js'

const NAME_PREFIX = 'componentsvc-'

let brandId: number
let otherBrandId: number
let modelId: number
let statusId: number
let readinessId: number

async function cleanupComponentData(): Promise<void> {
  const assets = { barcode: { startsWith: NAME_PREFIX } }
  await prisma.technicalSpecification.deleteMany({ where: { asset: assets } })
  await prisma.asset.deleteMany({ where: assets })
  await prisma.component.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

// Brands and models outlive the per-test cleanup and their names are unique, so the suite clears
// its own leftovers on the way in as well as on the way out.
async function cleanupBrands(): Promise<void> {
  await cleanupComponentData()
  await prisma.model.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
  await prisma.brand.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

function componentBody(name: string, brand = brandId, isActive = true) {
  return { name, brand_id: brand, is_active: isActive }
}

async function fitToAssets(componentId: number, count: number, tag: string): Promise<void> {
  for (let index = 0; index < count; index++) {
    await prisma.asset.create({
      data: {
        barcode: `${NAME_PREFIX}${tag}-${index}`,
        serial_number: `${NAME_PREFIX}${tag}-${index}`,
        model_id: modelId,
        status_id: statusId,
        readiness_id: readinessId,
        created_at: new Date(),
        technical_specification: { create: { component_id: componentId } },
      },
    })
  }
}

function countAssetsWith(componentId: number): Promise<number> {
  return prisma.technicalSpecification.count({ where: { component_id: componentId } })
}

describe('component service', () => {
  beforeAll(async () => {
    await cleanupBrands()
    const assetTypeId = (
      await prisma.assetType.findFirstOrThrow({ where: { asset_type: 'Copier' } })
    ).id
    statusId = (await prisma.status.findFirstOrThrow()).id
    readinessId = (await prisma.readiness.findFirstOrThrow()).id
    brandId = (await createBrand({ name: `${NAME_PREFIX}brand-a` })).id
    otherBrandId = (await createBrand({ name: `${NAME_PREFIX}brand-b` })).id
    modelId = (
      await createModel({
        name: `${NAME_PREFIX}model`,
        weight: 1,
        size: 1,
        brand_id: brandId,
        asset_type_id: assetTypeId,
        is_colour: false,
      })
    ).id
  })

  afterEach(cleanupComponentData)

  afterAll(cleanupBrands)

  describe('create and list', () => {
    it('lists a new component with its brand, active flag and asset count', async () => {
      const created = await createComponent(componentBody(`${NAME_PREFIX}S1`))
      await fitToAssets(created.id, 2, 'list')

      const row = (await listComponents()).find((component) => component.id === created.id)

      expect(row).toMatchObject({
        brand_id: brandId,
        brand_name: `${NAME_PREFIX}brand-a`,
        name: `${NAME_PREFIX}S1`,
        is_active: true,
        asset_count: 2,
      })
    })

    it('rejects a name the brand already has', async () => {
      await createComponent(componentBody(`${NAME_PREFIX}J1`))

      await expect(createComponent(componentBody(`${NAME_PREFIX}J1`))).rejects.toBeInstanceOf(
        ConflictError,
      )
    })

    it('allows the same name on another brand', async () => {
      await createComponent(componentBody(`${NAME_PREFIX}H1`))

      await expect(
        createComponent(componentBody(`${NAME_PREFIX}H1`, otherBrandId)),
      ).resolves.toEqual({ id: expect.any(Number) })
    })
  })

  describe('update', () => {
    it('renames a component and marks it inactive', async () => {
      const created = await createComponent(componentBody(`${NAME_PREFIX}D1`))

      await updateComponent(created.id, componentBody(`${NAME_PREFIX}D-1`, brandId, false))

      const saved = await prisma.component.findUniqueOrThrow({ where: { id: created.id } })
      expect(saved.name).toBe(`${NAME_PREFIX}D-1`)
      expect(saved.is_active).toBe(false)
    })

    it('moves an unused component to another brand', async () => {
      const created = await createComponent(componentBody(`${NAME_PREFIX}E1`))

      await updateComponent(created.id, componentBody(`${NAME_PREFIX}E1`, otherBrandId))

      const saved = await prisma.component.findUniqueOrThrow({ where: { id: created.id } })
      expect(saved.brand_id).toBe(otherBrandId)
    })

    it('refuses to change the brand of a component already on assets', async () => {
      const created = await createComponent(componentBody(`${NAME_PREFIX}K1`))
      await fitToAssets(created.id, 1, 'brand-lock')

      await expect(
        updateComponent(created.id, componentBody(`${NAME_PREFIX}K1`, otherBrandId)),
      ).rejects.toBeInstanceOf(ConflictError)
    })

    it('rejects a name another component of the brand holds', async () => {
      await createComponent(componentBody(`${NAME_PREFIX}taken`))
      const created = await createComponent(componentBody(`${NAME_PREFIX}L1`))

      await expect(
        updateComponent(created.id, componentBody(`${NAME_PREFIX}taken`)),
      ).rejects.toBeInstanceOf(ConflictError)
    })

    it('throws NotFoundError for a component that does not exist', async () => {
      await expect(
        updateComponent(-1, componentBody(`${NAME_PREFIX}ghost`)),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('merge', () => {
    it('keeps the component on the most assets and moves the rest onto it', async () => {
      const big = await createComponent(componentBody(`${NAME_PREFIX}FN1`))
      const small = await createComponent(componentBody(`${NAME_PREFIX}FN-1`))
      await fitToAssets(big.id, 3, 'big')
      await fitToAssets(small.id, 1, 'small')

      const merged = await mergeComponents([small.id, big.id], {
        name: `${NAME_PREFIX}FN1`,
        is_active: true,
      })

      expect(merged.id).toBe(big.id)
      expect(await countAssetsWith(big.id)).toBe(4)
      expect(await prisma.component.findUnique({ where: { id: small.id } })).toBeNull()
    })

    it('can give the kept component the name of the one merged away', async () => {
      const big = await createComponent(componentBody(`${NAME_PREFIX}NFN1`))
      const small = await createComponent(componentBody(`${NAME_PREFIX}NFN-1`))
      await fitToAssets(big.id, 2, 'rename')

      await mergeComponents([big.id, small.id], { name: `${NAME_PREFIX}NFN-1`, is_active: false })

      const survivor = await prisma.component.findUniqueOrThrow({ where: { id: big.id } })
      expect(survivor.name).toBe(`${NAME_PREFIX}NFN-1`)
      expect(survivor.is_active).toBe(false)
    })

    it('refuses to merge components of different brands', async () => {
      const first = await createComponent(componentBody(`${NAME_PREFIX}MX`))
      const second = await createComponent(componentBody(`${NAME_PREFIX}MX`, otherBrandId))

      await expect(previewComponentMerge([first.id, second.id])).rejects.toBeInstanceOf(
        ValidationError,
      )
      await expect(
        mergeComponents([first.id, second.id], { name: `${NAME_PREFIX}MX`, is_active: true }),
      ).rejects.toBeInstanceOf(ValidationError)
    })

    it('reports the winner and each component asset count before merging', async () => {
      const big = await createComponent(componentBody(`${NAME_PREFIX}FN27`))
      const small = await createComponent(componentBody(`${NAME_PREFIX}FN-27`))
      await fitToAssets(big.id, 2, 'preview')

      const preview = await previewComponentMerge([small.id, big.id])

      expect(preview.winner_id).toBe(big.id)
      expect(preview.candidates[0]).toMatchObject({ id: big.id, reference_count: 2 })
      expect(preview.candidates[1]).toMatchObject({ id: small.id, reference_count: 0 })
    })

    it('throws NotFoundError when one of the components is already gone', async () => {
      const only = await createComponent(componentBody(`${NAME_PREFIX}Z1`))

      await expect(
        mergeComponents([only.id, -1], { name: `${NAME_PREFIX}Z1`, is_active: true }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('leaves every component and asset in place when the merge fails', async () => {
      const first = await createComponent(componentBody(`${NAME_PREFIX}R1`))
      const second = await createComponent(componentBody(`${NAME_PREFIX}R-1`))
      await createComponent(componentBody(`${NAME_PREFIX}blocked`))
      await fitToAssets(second.id, 1, 'rollback')

      await expect(
        mergeComponents([first.id, second.id], { name: `${NAME_PREFIX}blocked`, is_active: true }),
      ).rejects.toBeInstanceOf(ConflictError)

      expect(await prisma.component.findUnique({ where: { id: first.id } })).not.toBeNull()
      expect(await prisma.component.findUnique({ where: { id: second.id } })).not.toBeNull()
      expect(await countAssetsWith(second.id)).toBe(1)
    })
  })
})
