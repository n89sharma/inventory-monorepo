import { Request, Response } from 'express'
import { ApiResponse, Brand, CreateBrandSchema, successResponse } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import * as brandService from '../services/brandService.js'

export const getBrands = asyncHandler(async (req: Request, res: Response<ApiResponse<Brand[]>>) => {
  res.json(successResponse(await brandService.listBrands()))
})

export const createBrand = asyncHandler(
  async (req: Request, res: Response<ApiResponse<{ id: number }>>) => {
    const body = CreateBrandSchema.parse(req.body)
    res.status(201).json(successResponse(await brandService.createBrand(body)))
  },
)
