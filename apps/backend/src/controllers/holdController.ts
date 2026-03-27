import { Request, Response } from 'express'
import { getHolds as getHoldsDb, getAssetsForHold as getAssetsForHoldDb} from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { z } from 'zod'
import { isAfter } from 'date-fns'

export const HoldQuerySchema = z.object({
  fromDate: z.string(),
  toDate: z.string().optional(),
  holdBy: z.coerce.number().int().optional(),
  holdFor: z.coerce.number().int().optional(),
}).transform((data) => ({
  fromDate: new Date(data.fromDate),
  toDate: data.toDate ? new Date(data.toDate) : new Date(),
  holdBy: data.holdBy,
  holdFor: data.holdFor,
})).refine((data) => !isAfter(data.fromDate, data.toDate), {
  message: 'fromDate must be before toDate',
})

export async function getHolds(req: Request, res: Response) {
  try {
    const { fromDate, toDate, holdBy, holdFor } = res.locals.query as z.infer<typeof HoldQuerySchema>
    const holds = await prisma.$queryRawTyped(getHoldsDb(fromDate, toDate, holdBy ?? 0, holdFor ?? 0))
    res.json(holds)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch holds' })
  }
}

export async function getAssetsForHold(req: Request, res: Response) {
  const { holdNumber } = req.params
  try {
    const assets = await prisma.$queryRawTyped(getAssetsForHoldDb(holdNumber))
    res.json(assets)
  } catch (error) {
    res.status(500).json({ error:  `Failed to fetch assets for hold ${holdNumber}` })
  }
}
