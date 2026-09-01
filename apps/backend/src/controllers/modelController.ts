import { Request, Response } from 'express'
import { ApiResponse, CreateModelSchema, ModelSummary, successResponse } from 'shared-types'
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
