import type { CreateOrg, OrgDetail, OrgMergePreview, UpdateOrg } from 'shared-types'
import { normalizeName } from 'shared-types'
import {
  getOrganizationReferenceCounts as getOrganizationReferenceCountsDb,
  getOrganizations as getOrganizationsDb,
} from '../../generated/prisma/sql.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

// An account number is a code, not a name: it has no casing worth preserving, and storing one
// canonical form is what keeps ab-1234 from being filed separately from AB-1234. It is optional,
// and a blank one is stored as null so it does not occupy the unique index.
function toAccountNumber(raw: string | null): string | null {
  const trimmed = raw?.trim().toUpperCase()
  return trimmed ? trimmed : null
}

function toOrgData(body: CreateOrg | UpdateOrg, accountNumber: string | null) {
  return {
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
  }
}

// excludeIds are the rows the caller already owns: the one being updated, or every row taking
// part in a merge. A merge writes the surviving row's name while its losers still exist, so all
// of them have to be invisible to this check.
async function assertOrgAvailable(
  tx: Prisma.TransactionClient,
  accountNumber: string | null,
  name: string,
  excludeIds: number[],
): Promise<void> {
  const exclude = excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}

  // Only a real account number can collide. Matching on null would find every other organization
  // that has none and reject the second one, which the unique index itself permits.
  if (accountNumber !== null) {
    const accountConflict = await tx.organization.findFirst({
      where: { account_number: accountNumber, ...exclude },
      select: { name: true },
    })
    if (accountConflict)
      throw new ConflictError(
        `Account number ${accountNumber} already belongs to "${accountConflict.name}"`,
      )
  }

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
    await assertOrgAvailable(tx, accountNumber, body.name, [])
    const org = await tx.organization.create({ data: toOrgData(body, accountNumber) })
    return { id: org.id }
  })
}

export async function updateOrganization(id: number, body: UpdateOrg): Promise<void> {
  const accountNumber = toAccountNumber(body.account_number)
  await prisma.$transaction(async (tx) => {
    const existing = await tx.organization.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError(`Organization ${id} not found`)

    await assertOrgAvailable(tx, accountNumber, body.name, [id])
    await tx.organization.update({ where: { id }, data: toOrgData(body, accountNumber) })
  })
}

async function readMergeCandidates(
  tx: Prisma.TransactionClient,
  ids: number[],
): Promise<OrgMergePreview> {
  const rows = await tx.$queryRawTyped(getOrganizationReferenceCountsDb(ids))
  if (rows.length !== ids.length)
    throw new NotFoundError('One or more of those organizations no longer exists')

  const candidates = rows.map((row) => ({ ...row, reference_count: row.reference_count ?? 0 }))
  // The query orders by reference_count desc, so the winner is first.
  return { winner_id: candidates[0].id, candidates }
}

export async function previewOrganizationMerge(ids: number[]): Promise<OrgMergePreview> {
  return prisma.$transaction((tx) => readMergeCandidates(tx, ids))
}

export async function mergeOrganizations(ids: number[], body: UpdateOrg): Promise<{ id: number }> {
  const accountNumber = toAccountNumber(body.account_number)
  return prisma.$transaction(async (tx) => {
    const { winner_id: winnerId } = await readMergeCandidates(tx, ids)
    const loserIds = ids.filter((id) => id !== winnerId)

    await assertOrgAvailable(tx, accountNumber, body.name, ids)

    await tx.invoice.updateMany({
      where: { organization_id: { in: loserIds } },
      data: { organization_id: winnerId },
    })
    await tx.arrival.updateMany({
      where: { origin_id: { in: loserIds } },
      data: { origin_id: winnerId },
    })
    await tx.arrival.updateMany({
      where: { transporter_id: { in: loserIds } },
      data: { transporter_id: winnerId },
    })
    await tx.departure.updateMany({
      where: { destination_id: { in: loserIds } },
      data: { destination_id: winnerId },
    })
    await tx.departure.updateMany({
      where: { transporter_id: { in: loserIds } },
      data: { transporter_id: winnerId },
    })
    await tx.hold.updateMany({
      where: { customer_id: { in: loserIds } },
      data: { customer_id: winnerId },
    })
    await tx.transfer.updateMany({
      where: { transporter_id: { in: loserIds } },
      data: { transporter_id: winnerId },
    })

    await tx.organization.update({ where: { id: winnerId }, data: toOrgData(body, accountNumber) })

    // A relation missed above would otherwise surface as a bare foreign key error from the
    // delete. Naming the row that still holds references makes that a fixable report.
    const remaining = await tx.$queryRawTyped(getOrganizationReferenceCountsDb(loserIds))
    const stillReferenced = remaining.filter((row) => (row.reference_count ?? 0) > 0)
    if (stillReferenced.length > 0)
      throw new ConflictError(
        `"${stillReferenced[0].name}" still has references that could not be moved`,
      )

    await tx.organization.deleteMany({ where: { id: { in: loserIds } } })
    return { id: winnerId }
  })
}
