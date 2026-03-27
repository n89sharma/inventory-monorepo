import { Request, Response } from 'express'
import { getModels as getModelsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getModels(req: Request, res: Response) {
  try {
    const models = await prisma.$queryRawTyped(getModelsDb())
    res.json(models)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' })
  }
}