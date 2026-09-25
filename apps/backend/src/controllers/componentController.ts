import { Request, Response } from 'express'
import {
  ApiResponse,
  ComponentMergePreview,
  ComponentSummary,
  CreateComponentSchema,
  MergeComponentSchema,
  UpdateComponentSchema,
  successResponse,
} from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as componentService from '../services/componentService.js'

export const getComponents = asyncHandler(
  async (req: Request, res: Response<ApiResponse<ComponentSummary[]>>) => {
    res.json(successResponse(await componentService.listComponents()))
  },
)

export const createComponent = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const body = CreateComponentSchema.parse(req.body)
    res.status(201).json(successResponse(await componentService.createComponent(body)))
  },
)

export const updateComponent = asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateComponentSchema.parse(req.body)
  await componentService.updateComponent(Number(req.params.componentId), body)
  res.status(204).send()
})

const MergeComponentPreviewSchema = MergeComponentSchema.pick({ ids: true })

export const previewComponentMerge = asyncHandler(
  async (req: Request, res: Response<ApiResponse<ComponentMergePreview>>) => {
    const { ids } = MergeComponentPreviewSchema.parse(req.body)
    res.json(successResponse(await componentService.previewComponentMerge(ids)))
  },
)

export const mergeComponents = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const { ids, component } = MergeComponentSchema.parse(req.body)
    res.json(successResponse(await componentService.mergeComponents(ids, component)))
  },
)
