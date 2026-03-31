import { Request, Response } from 'express'
import { ApiResponse, OrgSummary, response500, successResponse } from 'shared-types'
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