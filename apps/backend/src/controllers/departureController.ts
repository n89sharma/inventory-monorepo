import { Request, Response } from 'express'
import { getDepartures as getDeparturesDb, getAssetsForDepartures as getAssetsForDeparturesDb} from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { z } from 'zod'
import { DateRangeWithWarehouseSchema } from '../middleware/validation.js'

export async function getDepartures(req: Request, res: Response) {
  try {
    const { fromDate, toDate, warehouse } = res.locals.query as z.infer<typeof DateRangeWithWarehouseSchema>
    const departures = await prisma.$queryRawTyped(getDeparturesDb(fromDate, toDate, warehouse ?? 0))
    res.json(departures)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departures' })
  }
}

export async function getAssetsForDeparture(req: Request, res: Response) {
  const { departureNumber } = req.params
  try {
    const assets = await prisma.$queryRawTyped(getAssetsForDeparturesDb(departureNumber))
    res.json(assets)
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch assets for departure ${departureNumber}` })
  }
}