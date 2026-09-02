import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createOrganization,
  mergeOrganizations,
  previewOrganizationMerge,
} from './organizationService.js'

const NAME_PREFIX = 'orgmerge-'

let warehouseId: number
let userId: number

async function cleanupMergeData(): Promise<void> {
  await prisma.arrival.deleteMany({ where: { arrival_number: { startsWith: NAME_PREFIX } } })
  await prisma.organization.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

function orgBody(name: string, accountNumber: string | null = null) {
  return {
    account_number: accountNumber,
    name,
    contact_name: null,
    phone: null,
    mobile: null,
    primary_email: null,
    address: null,
    city: null,
    province: null,
    country: null,
  }
}

// Arrivals are the cheapest way to give an organization a reference: origin_id is the vendor.
async function seedArrivals(orgId: number, count: number, tag: string): Promise<void> {
  for (let index = 0; index < count; index++) {
    await prisma.arrival.create({
      data: {
        arrival_number: `${NAME_PREFIX}${tag}-${index}`,
        origin_id: orgId,
        destination_id: warehouseId,
        transporter_id: orgId,
        created_by_id: userId,
        created_at: new Date(),
      },
    })
  }
}

describe('organization merge', () => {
  beforeAll(async () => {
    warehouseId = (await prisma.warehouse.findFirstOrThrow()).id
    userId = (await prisma.user.findFirstOrThrow()).id
  })

  afterEach(cleanupMergeData)

  it('keeps the row with the most references and repoints the rest onto it', async () => {
    const big = await createOrganization(orgBody(`${NAME_PREFIX}KDI`))
    const small = await createOrganization(orgBody(`${NAME_PREFIX}KDI Office Technology`))
    await seedArrivals(big.id, 3, 'big')
    await seedArrivals(small.id, 1, 'small')

    const merged = await mergeOrganizations(
      [small.id, big.id],
      orgBody(`${NAME_PREFIX}KDI`, 'KDI-1'),
    )

    expect(merged.id).toBe(big.id)
    const survivor = await prisma.organization.findUniqueOrThrow({ where: { id: big.id } })
    expect(survivor.name).toBe(`${NAME_PREFIX}KDI`)
    expect(survivor.account_number).toBe('KDI-1')
    expect(await prisma.organization.findUnique({ where: { id: small.id } })).toBeNull()
  })

  it('moves every reference rather than losing any', async () => {
    const big = await createOrganization(orgBody(`${NAME_PREFIX}alpha`))
    const small = await createOrganization(orgBody(`${NAME_PREFIX}alpha inc`))
    await seedArrivals(big.id, 2, 'a')
    await seedArrivals(small.id, 2, 'b')
    const totalBefore = await prisma.arrival.count({
      where: { arrival_number: { startsWith: NAME_PREFIX } },
    })

    await mergeOrganizations([big.id, small.id], orgBody(`${NAME_PREFIX}alpha`))

    expect(
      await prisma.arrival.count({ where: { arrival_number: { startsWith: NAME_PREFIX } } }),
    ).toBe(totalBefore)
    expect(await prisma.arrival.count({ where: { origin_id: big.id } })).toBe(4)
    expect(await prisma.arrival.count({ where: { transporter_id: big.id } })).toBe(4)
  })

  // The whole reason the merge updates a winner instead of inserting a new row: re-entering a
  // name that one of the merged rows already holds must not trip the name_normalized index.
  it('accepts the name of a row being merged', async () => {
    const first = await createOrganization(orgBody(`${NAME_PREFIX}KDI`))
    const second = await createOrganization(orgBody(`${NAME_PREFIX}KDI Office Technology`))

    await expect(
      mergeOrganizations([first.id, second.id], orgBody(`${NAME_PREFIX}KDI`)),
    ).resolves.toEqual({ id: expect.any(Number) })
  })

  it('rejects a name already held by an organization outside the merge', async () => {
    const first = await createOrganization(orgBody(`${NAME_PREFIX}beta`))
    const second = await createOrganization(orgBody(`${NAME_PREFIX}beta corp`))
    await createOrganization(orgBody(`${NAME_PREFIX}unrelated`))

    await expect(
      mergeOrganizations([first.id, second.id], orgBody(`${NAME_PREFIX}unrelated`)),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('reports the winner and each row reference count before merging', async () => {
    const big = await createOrganization(orgBody(`${NAME_PREFIX}gamma`))
    const small = await createOrganization(orgBody(`${NAME_PREFIX}gamma ltd`))
    await seedArrivals(big.id, 2, 'g')

    const preview = await previewOrganizationMerge([small.id, big.id])

    expect(preview.winner_id).toBe(big.id)
    expect(preview.candidates).toHaveLength(2)
    // origin_id and transporter_id both point at it, so two arrivals are four references.
    expect(preview.candidates[0]).toMatchObject({ id: big.id, reference_count: 4 })
    expect(preview.candidates[1]).toMatchObject({ id: small.id, reference_count: 0 })
  })

  it('throws NotFoundError when one of the rows is already gone', async () => {
    const only = await createOrganization(orgBody(`${NAME_PREFIX}delta`))

    await expect(
      mergeOrganizations([only.id, -1], orgBody(`${NAME_PREFIX}delta`)),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('leaves every row in place when the merge fails', async () => {
    const first = await createOrganization(orgBody(`${NAME_PREFIX}epsilon`))
    const second = await createOrganization(orgBody(`${NAME_PREFIX}epsilon two`))
    await createOrganization(orgBody(`${NAME_PREFIX}taken`))
    await seedArrivals(second.id, 1, 'e')

    await expect(
      mergeOrganizations([first.id, second.id], orgBody(`${NAME_PREFIX}taken`)),
    ).rejects.toBeInstanceOf(ConflictError)

    expect(await prisma.organization.findUnique({ where: { id: first.id } })).not.toBeNull()
    expect(await prisma.organization.findUnique({ where: { id: second.id } })).not.toBeNull()
    expect(await prisma.arrival.count({ where: { origin_id: second.id } })).toBe(1)
  })
})
