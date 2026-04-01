import { NextFunction, Request, Response } from 'express'
import { ApiResponse, ArrivalDetail, ArrivalSummary, CreateArrivalSchema, UpdateArrival, UpdateArrivalSchema, response500, successResponse } from 'shared-types'
import { z } from 'zod'
import { getArrivals as getArrivalsDb } from '../../generated/prisma/sql.js'
import { DateRangeWithWarehouseSchema } from '../middleware/validation.js'
import { prisma } from '../prisma.js'
import { createArrival as createArrivalSer, getArrivalForUpdate as getArrivalForEditSer, getArrival as getArrivalSer, updateArrival as updateArrivalSer } from '../services/arrivalService.js'

export async function getArrivals(
  req: Request,
  res: Response<ApiResponse<ArrivalSummary[]>>) {
  try {
    const { fromDate, toDate, warehouse } = res.locals.query as z.infer<typeof DateRangeWithWarehouseSchema>
    const arrivals = await prisma.$queryRawTyped(getArrivalsDb(fromDate, toDate, warehouse ?? 0))
    res.json(successResponse(arrivals))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch arrivals'))
  }
}

export async function getArrival(
  req: Request,
  res: Response<ApiResponse<ArrivalDetail>>) {

  const { arrivalNumber } = req.params
  const response = await getArrivalSer(arrivalNumber)
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

export async function createArrival(
  req: Request,
  res: Response<{ arrivalNumber: string }>,
  next: NextFunction) {

  try {
    const validatedArrival = CreateArrivalSchema.parse(req.body)
    const arrivalNumber = await createArrivalSer(validatedArrival)
    res.status(201).json({ arrivalNumber: arrivalNumber })
  } catch (error) {
    next(error)
  }
}

export async function getArrivalForUpdate(
  req: Request,
  res: Response<ApiResponse<UpdateArrival>>) {

  const { arrivalNumber } = req.params
  const response = await getArrivalForEditSer(arrivalNumber)
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

export async function updateArrival(
  req: Request,
  res: Response<{ arrivalNumber: string }>,
  next: NextFunction) {

  const { arrivalNumber } = req.params
  try {
    const validated = UpdateArrivalSchema.parse(req.body)
    await updateArrivalSer(validated)
    res.json({ arrivalNumber })
  } catch (error) {
    next(error)
  }
}