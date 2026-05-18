import { Request, Response } from 'express'
import { ApiResponse, AssetDeltaSchema, CollectionHistory, CreateArrivalSchema, SubmitUpdateArrivalSchema, successResponse } from 'shared-types'
import { z } from 'zod'
import { getArrivals as getArrivalsDb } from '../../generated/prisma/sql.js'
import { DateRangeWithWarehouseSchema } from '../middleware/validation.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createArrival as createArrivalSer,
  getArrivalForUpdate as getArrivalForEditSer,
  getArrival as getArrivalSer,
  patchArrivalAssets as patchArrivalAssetsSer,
  updateArrival as updateArrivalSer
} from '../services/arrivalService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

export const getArrivals = asyncHandler(async (req, res) => {
  const { fromDate, toDate, warehouse } = res.locals.query as z.infer<typeof DateRangeWithWarehouseSchema>
  const arrivals = await prisma.$queryRawTyped(getArrivalsDb(fromDate, toDate, warehouse ?? 0))
  res.json(successResponse(arrivals))
})

export const getArrival = asyncHandler(async (req, res) => {
  const { arrivalNumber } = req.params
  const data = await getArrivalSer(arrivalNumber)
  res.json(successResponse(data))
})

export const createArrival = asyncHandler(async (req, res) => {
  const validatedArrival = CreateArrivalSchema.parse(req.body)
  const arrivalNumber = await createArrivalSer(validatedArrival, res.locals.dbUserId)
  res.status(201).json({ arrivalNumber })
})

export const getArrivalForUpdate = asyncHandler(async (req, res) => {
  const { arrivalNumber } = req.params
  const data = await getArrivalForEditSer(arrivalNumber)
  res.json(successResponse(data))
})

export const updateArrival = asyncHandler(async (req, res) => {
  const { arrivalNumber } = req.params
  const validated = SubmitUpdateArrivalSchema.parse(req.body)
  await updateArrivalSer(validated, res.locals.dbUserId)
  res.json({ arrivalNumber })
})

export const patchArrivalAssets = asyncHandler(async (req, res) => {
  const delta = AssetDeltaSchema.parse(req.body)
  await patchArrivalAssetsSer(req.params.arrivalNumber, delta, res.locals.dbUserId)
  res.status(204).send()
})

export const getArrivalHistory = asyncHandler(async (req: Request, res: Response<ApiResponse<CollectionHistory>>) => {
  const { arrivalNumber } = req.params
  const arrival = await prisma.arrival.findUnique({
    where: { arrival_number: arrivalNumber }, select: { id: true }
  })
  if (!arrival) throw new NotFoundError(`Arrival ${arrivalNumber} not found`)
  const history = await getCollectionHistorySer('Arrival', arrival.id)
  res.json(successResponse(history))
})
