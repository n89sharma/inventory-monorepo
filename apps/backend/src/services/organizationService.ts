import type { CreateOrg, OrgDetail, UpdateOrg } from 'shared-types'
import { normalizeName } from 'shared-types'
import { getOrganizations as getOrganizationsDb } from '../../generated/prisma/sql.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

// An account number is a code, not a name: it has no casing worth preserving, and storing one
// canonical form is what keeps ab-1234 from being filed separately from AB-1234.
function toAccountNumber(raw: string): string {
  return raw.trim().toUpperCase()
}

async function assertOrgAvailable(
  tx: Prisma.TransactionClient,
  accountNumber: string,
  name: string,
  excludeId: number | null,
): Promise<void> {
  const exclude = excludeId === null ? {} : { id: { not: excludeId } }

  const accountConflict = await tx.organization.findFirst({
    where: { account_number: accountNumber, ...exclude },
    select: { name: true },
  })
  if (accountConflict)
    throw new ConflictError(
      `Account number ${accountNumber} already belongs to "${accountConflict.name}"`,
    )

  const nameConflict = await tx.organization.findFirst({
    where: { name_normalized: normalizeName(name), ...exclude },
    select: { name: true },
  })
  if (nameConflict)
    throw new ConflictError(`An organization named "${nameConflict.name}" already exists`)
}

export async function listOrganizations(): Promise<OrgDetail[]> {
  return prisma.$queryRawTyped(getOrganizationsDb())
}

export async function createOrganization(body: CreateOrg): Promise<{ id: number }> {
  const accountNumber = toAccountNumber(body.account_number)
  return prisma.$transaction(async (tx) => {
    await assertOrgAvailable(tx, accountNumber, body.name, null)
    const org = await tx.organization.create({
      data: {
        account_number: accountNumber,
        name: body.name,
        contact_name: body.contact_name,
        phone: body.phone,
        mobile: body.mobile,
        primary_email: body.primary_email,
        address: body.address,
        city: body.city,
        province: body.province,
        country: body.country,
      },
    })
    return { id: org.id }
  })
}

export async function updateOrganization(id: number, body: UpdateOrg): Promise<void> {
  const accountNumber = toAccountNumber(body.account_number)
  await prisma.$transaction(async (tx) => {
    const existing = await tx.organization.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError(`Organization ${id} not found`)

    await assertOrgAvailable(tx, accountNumber, body.name, id)
    await tx.organization.update({
      where: { id },
      data: {
        account_number: accountNumber,
        name: body.name,
        contact_name: body.contact_name,
        phone: body.phone,
        mobile: body.mobile,
        primary_email: body.primary_email,
        address: body.address,
        city: body.city,
        province: body.province,
        country: body.country,
      },
    })
  })
}
