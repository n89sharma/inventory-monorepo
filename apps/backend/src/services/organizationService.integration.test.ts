import { afterEach, describe, expect, it } from 'vitest'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { createOrganization, updateOrganization } from './organizationService.js'

const NAME_PREFIX = 'orgsvc-'
const ACCOUNT_PREFIX = 'ORGSVC-'

async function cleanupOrgs(): Promise<void> {
  await prisma.organization.deleteMany({ where: { name: { startsWith: NAME_PREFIX } } })
}

function orgBody(accountNumber: string, name: string) {
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

describe('organizationService', () => {
  afterEach(cleanupOrgs)

  it('updates an organization', async () => {
    const { id } = await createOrganization(orgBody(`${ACCOUNT_PREFIX}1`, `${NAME_PREFIX}acme`))

    await updateOrganization(id, {
      ...orgBody(`${ACCOUNT_PREFIX}1`, `${NAME_PREFIX}acme copiers`),
      city: 'Toronto',
    })

    const org = await prisma.organization.findUniqueOrThrow({ where: { id } })
    expect(org.name).toBe(`${NAME_PREFIX}acme copiers`)
    expect(org.city).toBe('Toronto')
  })

  it('uppercases the account number on create and on update', async () => {
    const { id } = await createOrganization(
      orgBody(`${ACCOUNT_PREFIX}lower-a`, `${NAME_PREFIX}casing`),
    )
    const created = await prisma.organization.findUniqueOrThrow({ where: { id } })
    expect(created.account_number).toBe(`${ACCOUNT_PREFIX}LOWER-A`)

    await updateOrganization(id, orgBody(`${ACCOUNT_PREFIX}lower-b`, `${NAME_PREFIX}casing`))
    const updated = await prisma.organization.findUniqueOrThrow({ where: { id } })
    expect(updated.account_number).toBe(`${ACCOUNT_PREFIX}LOWER-B`)
  })

  it('rejects a lowercase account number colliding with an existing uppercased one', async () => {
    await createOrganization(orgBody(`${ACCOUNT_PREFIX}DUP`, `${NAME_PREFIX}first`))

    await expect(
      createOrganization(orgBody(`${ACCOUNT_PREFIX}dup`, `${NAME_PREFIX}second`)),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('rejects a case or punctuation variant of an existing name', async () => {
    await createOrganization(orgBody(`${ACCOUNT_PREFIX}2`, `${NAME_PREFIX}ABC Copiers Inc`))

    await expect(
      createOrganization(orgBody(`${ACCOUNT_PREFIX}3`, `${NAME_PREFIX}abc-copiers-inc`)),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('allows saving an organization under its own unchanged name', async () => {
    const body = orgBody(`${ACCOUNT_PREFIX}4`, `${NAME_PREFIX}unchanged`)
    const { id } = await createOrganization(body)

    await expect(updateOrganization(id, body)).resolves.toBeUndefined()
  })

  it('throws NotFoundError for an unknown id', async () => {
    await expect(
      updateOrganization(-1, orgBody(`${ACCOUNT_PREFIX}5`, `${NAME_PREFIX}ghost`)),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
