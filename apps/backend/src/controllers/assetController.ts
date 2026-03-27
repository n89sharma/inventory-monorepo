import { Request, Response } from 'express'
import { prisma } from '../prisma.js'
import { getAssetsForQuery } from '../../generated/prisma/sql.js'
import { z } from 'zod'

export const AssetQuerySchema = z.object({
  model: z.string(),
  trackingStatusId: z.string().optional().transform(Number),
  availabilityStatusId: z.string().optional().transform(Number),
  technicalStatusId: z.string().optional().transform(Number),
  warehouseId: z.string().optional().transform(Number),
  meter: z.string().optional().transform(Number)
})

export async function getAssets(req: Request, res: Response) {
  try {
    const {
      model,
      trackingStatusId,
      availabilityStatusId,
      technicalStatusId,
      warehouseId,
      meter } = res.locals.query as z.infer<typeof AssetQuerySchema>

    const assets = await prisma.$queryRawTyped(getAssetsForQuery(
      model,
      isNaN(trackingStatusId) ? 0 : trackingStatusId,
      isNaN(availabilityStatusId) ? 0 : availabilityStatusId,
      isNaN(technicalStatusId) ? 0 : technicalStatusId,
      isNaN(warehouseId) ? 0 : warehouseId,
      isNaN(meter) ? -1 : meter
    ))
    res.json(assets)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
}