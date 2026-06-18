import { Request, Response } from 'express'
import {
  ApiResponse,
  CreateSavedViewSchema,
  SavedViewPageKeySchema,
  SavedViewSummary,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  createSavedView as createSavedViewSer,
  deleteSavedView as deleteSavedViewSer,
  listSavedViews as listSavedViewsSer,
} from '../services/savedViewService.js'

const SavedViewIdSchema = z.coerce.number().int().positive()

export const getSavedViews = asyncHandler(
  async (req: Request, res: Response<ApiResponse<SavedViewSummary[]>>) => {
    const pageKey = SavedViewPageKeySchema.parse(req.query.pageKey)
    const views = await listSavedViewsSer(res.locals.dbUserId, pageKey)
    res.json(successResponse(views))
  },
)

export const createSavedView = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const body = CreateSavedViewSchema.parse(req.body)
    const result = await createSavedViewSer(res.locals.dbUserId, body)
    res.status(201).json(successResponse(result))
  },
)

export const deleteSavedView = asyncHandler(async (req: Request, res: Response) => {
  const id = SavedViewIdSchema.parse(req.params.id)
  await deleteSavedViewSer(res.locals.dbUserId, id)
  res.status(204).send()
})
