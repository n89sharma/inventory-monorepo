import { NextFunction, Request, Response } from 'express'
import { ApiResponse, Brand, CreateBrandSchema, successResponse } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import { prisma } from '../prisma.js'

export const getBrands = asyncHandler(async (req: Request, res: Response<ApiResponse<Brand[]>>) => {
  const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } })
  res.json(successResponse(brands))
})

export async function createBrand(
  req: Request,
  res: Response<ApiResponse<{ id: number }>>,
  next: NextFunction
) {
  try {
    const body = CreateBrandSchema.parse(req.body)
    const brand = await prisma.brand.create({ data: { name: body.name } })
    res.status(201).json(successResponse({ id: brand.id }))
  } catch (error) {
    next(error)
  }
}
