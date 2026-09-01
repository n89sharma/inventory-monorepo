import { afterEach, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createBrand, updateBrand } from './brandService.js'

// Distinct prefix so cleanup targets only rows this suite creates — brand names are unique,
// so leftovers would break reruns.
const NAME_PREFIX = 'brandsvc-'

async function cleanupBrands(): Promise<void> {
  await prisma.brand.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

describe('brandService', () => {
  afterEach(cleanupBrands)

  it('renames a brand', async () => {
    const { id } = await createBrand({ name: `${NAME_PREFIX}canon` })

    await updateBrand(id, { name: `${NAME_PREFIX}canon-renamed` })

    const brand = await prisma.brand.findUniqueOrThrow({ where: { id } })
    expect(brand.name).toBe(`${NAME_PREFIX}canon-renamed`)
  })

  it('rejects a rename onto an existing brand', async () => {
    await createBrand({ name: `${NAME_PREFIX}canon` })
    const { id } = await createBrand({ name: `${NAME_PREFIX}ricoh` })

    await expect(updateBrand(id, { name: `${NAME_PREFIX}canon` })).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('rejects a case or punctuation variant of an existing brand', async () => {
    await createBrand({ name: `${NAME_PREFIX}Canon Inc` })

    await expect(createBrand({ name: `${NAME_PREFIX}canon-inc` })).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('keeps `+` significant, so C1 and C1+ are different brands', async () => {
    await createBrand({ name: `${NAME_PREFIX}series-c1` })

    const plus = await createBrand({ name: `${NAME_PREFIX}series-c1+` })

    const brand = await prisma.brand.findUniqueOrThrow({ where: { id: plus.id } })
    expect(brand.name).toBe(`${NAME_PREFIX}series-c1+`)
  })

  it('allows saving a brand under its own unchanged name', async () => {
    const name = `${NAME_PREFIX}unchanged`
    const { id } = await createBrand({ name })

    await expect(updateBrand(id, { name })).resolves.toBeUndefined()
  })

  it('throws NotFoundError for an unknown id', async () => {
    await expect(updateBrand(-1, { name: `${NAME_PREFIX}ghost` })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
