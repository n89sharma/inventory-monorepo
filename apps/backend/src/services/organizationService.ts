import type { CreateOrg, OrgSummary } from 'shared-types'
import { getOrganizations as getOrganizationsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function listOrganizations(): Promise<OrgSummary[]> {
  return prisma.$queryRawTyped(getOrganizationsDb())
}

export async function createOrganization(body: CreateOrg): Promise<{ id: number }> {
  const org = await prisma.organization.create({
    data: {
      account_number: body.account_number,
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
}
