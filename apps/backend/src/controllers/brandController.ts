import { Request, Response } from 'express'
import { ApiResponse, Brand, CreateBrandSchema, response400, response500, successResponse } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../prisma.js'

export async function getBrands(req: Request, res: Response<ApiResponse<Brand[]>>) {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } })
    res.json(successResponse(brands))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch brands'))
  }
}

export async function createBrand(req: Request, res: Response<ApiResponse<{ id: number }>>) {
  try {
    const body = CreateBrandSchema.parse(req.body)
    const brand = await prisma.brand.create({ data: { name: body.name } })
    res.status(201).json(successResponse({ id: brand.id }))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json(response400('A brand with this name already exists'))
    }
    res.status(500).json(response500('Failed to create brand'))
  }
}
