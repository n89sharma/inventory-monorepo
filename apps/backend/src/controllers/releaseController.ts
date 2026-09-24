import { Request, Response } from 'express'
import {
  AdminRelease,
  ApiResponse,
  Release,
  SaveReleaseSchema,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  createRelease as createReleaseSer,
  deleteRelease as deleteReleaseSer,
  listReleasesForAdmin,
  listReleasesForUser,
  saveRelease as saveReleaseSer,
} from '../services/releaseService.js'

const ReleaseIdSchema = z.coerce.number().int().positive()

export const getReleases = asyncHandler(
  async (_req: Request, res: Response<ApiResponse<Release[]>>) => {
    const releases = await listReleasesForUser(res.locals.dbUserId, res.locals.permissions)
    res.json(successResponse(releases))
  },
)

export const getAdminReleases = asyncHandler(
  async (_req: Request, res: Response<ApiResponse<AdminRelease[]>>) => {
    const releases = await listReleasesForAdmin()
    res.json(successResponse(releases))
  },
)

export const createRelease = asyncHandler(
  async (_req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const result = await createReleaseSer(res.locals.dbUserId)
    res.status(201).json(successResponse(result))
  },
)

export const saveRelease = asyncHandler(async (req: Request, res: Response) => {
  const id = ReleaseIdSchema.parse(req.params.releaseId)
  const body = SaveReleaseSchema.parse(req.body)
  await saveReleaseSer(id, body)
  res.status(204).send()
})

export const deleteRelease = asyncHandler(async (req: Request, res: Response) => {
  const id = ReleaseIdSchema.parse(req.params.releaseId)
  await deleteReleaseSer(id)
  res.status(204).send()
})
