import { Request, Response } from 'express'
import { ApiResponse, CreateOrgSchema, OrgSummary, response400, response500, successResponse } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { getOrganizations as getOrganizationsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getOrganizations(req: Request, res: Response<ApiResponse<OrgSummary[]>>) {
  try {
    const orgs = await prisma.$queryRawTyped(getOrganizationsDb())
    res.json(successResponse(orgs))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch orgs'))
  }
}

export async function createOrganization(req: Request, res: Response<ApiResponse<{ id: number }>>) {
  try {
    const body = CreateOrgSchema.parse(req.body)
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
        country: body.country
      }
    })
    res.status(201).json(successResponse({ id: org.id }))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json(response400('An organization with this account number already exists'))
    }
    res.status(500).json(response500('Failed to create organization'))
  }
}