import { NextFunction, Request, Response } from 'express'
import { ApiResponse, CreateOrgSchema, OrgSummary, successResponse } from 'shared-types'
import { getOrganizations as getOrganizationsDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { prisma } from '../prisma.js'

export const getOrganizations = asyncHandler(async (req: Request, res: Response<ApiResponse<OrgSummary[]>>) => {
  const orgs = await prisma.$queryRawTyped(getOrganizationsDb())
  res.json(successResponse(orgs))
})

export async function createOrganization(
  req: Request,
  res: Response<ApiResponse<{ id: number }>>,
  next: NextFunction
) {
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
    next(error)
  }
}
