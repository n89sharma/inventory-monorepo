import { Request, Response } from 'express'
import { ApiResponse, DepartureDetail, DepartureSummary, response500, successResponse } from 'shared-types'
import { z } from 'zod'
import { getDepartures as getDeparturesDb } from '../../generated/prisma/sql.js'
import { DateRangeWithWarehouseSchema } from '../middleware/validation.js'
import { prisma } from '../prisma.js'
import { getDeparture as getDepartureSer } from '../services/departureService.js'

export async function getDepartures(req: Request, res: Response<ApiResponse<DepartureSummary[]>>) {
  try {
    const { fromDate, toDate, warehouse } = res.locals.query as z.infer<typeof DateRangeWithWarehouseSchema>
    const departures = await prisma.$queryRawTyped(getDeparturesDb(fromDate, toDate, warehouse ?? 0))
    res.json(successResponse(departures))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch departures'))
  }
}

export async function getDepartureDetail(req: Request, res: Response<ApiResponse<DepartureDetail>>) {
  const { departureNumber } = req.params
  const response = await getDepartureSer(departureNumber)
  if (response.success) {
    return res.json(response)
  } else {
    if (response.error.status === 400) {
      return res.status(404).json(response)
    } else {
      return res.status(500).json(response)
    }
  }
}
