import { Request, Response } from 'express'
import {
  ApiResponse,
  CreateOrgSchema,
  MergeOrgSchema,
  OrgDetail,
  OrgMergePreview,
  UpdateOrgSchema,
  successResponse,
} from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as organizationService from '../services/organizationService.js'

export const getOrganizations = asyncHandler(
  async (req: Request, res: Response<ApiResponse<OrgDetail[]>>) => {
    res.json(successResponse(await organizationService.listOrganizations()))
  },
)

export const createOrganization = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const body = CreateOrgSchema.parse(req.body)
    res.status(201).json(successResponse(await organizationService.createOrganization(body)))
  },
)

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateOrgSchema.parse(req.body)
  await organizationService.updateOrganization(Number(req.params.orgId), body)
  res.status(204).send()
})

const MergeOrgPreviewSchema = MergeOrgSchema.pick({ ids: true })

export const previewOrganizationMerge = asyncHandler(
  async (req: Request, res: Response<ApiResponse<OrgMergePreview>>) => {
    const { ids } = MergeOrgPreviewSchema.parse(req.body)
    res.json(successResponse(await organizationService.previewOrganizationMerge(ids)))
  },
)

export const mergeOrganizations = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const { ids, organization } = MergeOrgSchema.parse(req.body)
    res.json(successResponse(await organizationService.mergeOrganizations(ids, organization)))
  },
)
