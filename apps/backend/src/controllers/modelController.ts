import { Request, Response } from 'express'
import {
  ApiResponse,
  CreateModelSchema,
  MergeModelSchema,
  ModelMergePreview,
  ModelSummary,
  UpdateModelSchema,
  successResponse,
} from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as modelService from '../services/modelService.js'

export const getModels = asyncHandler(
  async (req: Request, res: Response<ApiResponse<ModelSummary[]>>) => {
    res.json(successResponse(await modelService.listModels()))
  },
)

export const createModel = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const body = CreateModelSchema.parse(req.body)
    res.status(201).json(successResponse(await modelService.createModel(body)))
  },
)

export const updateModel = asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateModelSchema.parse(req.body)
  await modelService.updateModel(Number(req.params.modelId), body)
  res.status(204).send()
})

const MergeModelPreviewSchema = MergeModelSchema.pick({ ids: true })

export const previewModelMerge = asyncHandler(
  async (req: Request, res: Response<ApiResponse<ModelMergePreview>>) => {
    const { ids } = MergeModelPreviewSchema.parse(req.body)
    res.json(successResponse(await modelService.previewModelMerge(ids)))
  },
)

export const mergeModels = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const { ids, model } = MergeModelSchema.parse(req.body)
    res.json(successResponse(await modelService.mergeModels(ids, model)))
  },
)
