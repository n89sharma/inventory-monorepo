import { Request, Response } from 'express'
import { ApiResponse, Model, response500, successResponse } from 'shared-types'
import { getModels as getModelsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getModels(req: Request, res: Response<ApiResponse<Model[]>>) {
  try {
    const models = await prisma.$queryRawTyped(getModelsDb())
    res.json(successResponse(models))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch models'))
  }
}