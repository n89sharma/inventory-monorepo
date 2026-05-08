import { NextFunction, Request, Response } from 'express'
import { ApiResponse, CollectionHistory, CreateDepartureSchema, DepartureDetail, DepartureSummary, SubmitUpdateDepartureSchema, response400, response500, successResponse } from 'shared-types'
import { z } from 'zod'
import { getDepartures as getDeparturesDb } from '../../generated/prisma/sql.js'
import { DateRangeWithWarehouseSchema } from '../middleware/validation.js'
import { prisma } from '../prisma.js'
import {
  createDeparture as createDepartureSer,
  getDepartureForUpdate as getDepartureForUpdateSer,
  getDeparture as getDepartureSer,
  updateDeparture as updateDepartureSer
} from '../services/departureService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

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

export async function getDepartureForUpdate(req: Request, res: Response, next: NextFunction) {
  const { departureNumber } = req.params
  const response = await getDepartureForUpdateSer(departureNumber)
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

export async function createDeparture(req: Request, res: Response, next: NextFunction) {
  try {
    const departure = CreateDepartureSchema.parse(req.body)
    const departureNumber = await createDepartureSer(departure, res.locals.dbUserId)
    res.status(201).json({ departureNumber })
  } catch (error) {
    next(error)
  }
}

export async function updateDeparture(req: Request, res: Response, next: NextFunction) {
  try {
    const departure = SubmitUpdateDepartureSchema.parse(req.body)
    await updateDepartureSer(departure, res.locals.dbUserId)
    res.json({ departureNumber: req.params.departureNumber })
  } catch (error) {
    next(error)
  }
}

export async function getDepartureHistory(
  req: Request,
  res: Response<ApiResponse<CollectionHistory>>
) {
  const { departureNumber } = req.params
  try {
    const departure = await prisma.departure.findUnique({
      where: { departure_number: departureNumber }, select: { id: true }
    })
    if (!departure) return res.status(404).json(response400(`Departure ${departureNumber} not found`))
    const history = await getCollectionHistorySer('Departure', departure.id)
    return res.json(successResponse(history))
  } catch {
    return res.status(500).json(response500(`Failed to fetch history for departure ${departureNumber}`))
  }
}
