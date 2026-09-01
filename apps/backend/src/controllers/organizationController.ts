import { Request, Response } from 'express'
import { ApiResponse, CreateOrgSchema, OrgSummary, successResponse } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as organizationService from '../services/organizationService.js'

export const getOrganizations = asyncHandler(
  async (req: Request, res: Response<ApiResponse<OrgSummary[]>>) => {
    res.json(successResponse(await organizationService.listOrganizations()))
  },
)

export const createOrganization = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const body = CreateOrgSchema.parse(req.body)
    res.status(201).json(successResponse(await organizationService.createOrganization(body)))
  },
)
