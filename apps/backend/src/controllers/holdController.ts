import { isAfter } from 'date-fns'
import { Request, Response } from 'express'
import { ApiResponse, CollectionHistory, CreateHoldSchema, HoldDetail, HoldSummary, SubmitUpdateHoldSchema, successResponse } from 'shared-types'
import { z } from 'zod'
import { getHolds as getHoldsDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createHold as createHoldSer,
  getHold as getHoldSer,
  getHoldForUpdate as getHoldForUpdateSer,
  updateHold as updateHoldSer
} from '../services/holdService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

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

export const getHolds = asyncHandler(async (req: Request, res: Response<ApiResponse<HoldSummary[]>>) => {
  const { fromDate, toDate, holdBy, holdFor } = res.locals.query as z.infer<typeof HoldQuerySchema>
  const holds = await prisma.$queryRawTyped(getHoldsDb(fromDate, toDate, holdBy ?? 0, holdFor ?? 0))
  res.json(successResponse(holds))
})

export const createHold = asyncHandler(async (req, res) => {
  const validated = CreateHoldSchema.parse(req.body)
  const holdNumber = await createHoldSer(validated, res.locals.dbUserId)
  res.status(201).json({ holdNumber })
})

export const getHoldForUpdate = asyncHandler(async (req, res) => {
  const { holdNumber } = req.params
  const data = await getHoldForUpdateSer(holdNumber)
  res.json(successResponse(data))
})

export const updateHold = asyncHandler(async (req, res) => {
  const validated = SubmitUpdateHoldSchema.parse(req.body)
  await updateHoldSer(validated, res.locals.dbUserId)
  res.json({ holdNumber: req.params.holdNumber })
})

export const getHoldDetail = asyncHandler(async (req: Request, res: Response<ApiResponse<HoldDetail>>) => {
  const { holdNumber } = req.params
  const data = await getHoldSer(holdNumber)
  res.json(successResponse(data))
})

export const getHoldHistory = asyncHandler(async (req: Request, res: Response<ApiResponse<CollectionHistory>>) => {
  const { holdNumber } = req.params
  const hold = await prisma.hold.findUnique({
    where: { hold_number: holdNumber }, select: { id: true }
  })
  if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
  const history = await getCollectionHistorySer('Hold', hold.id)
  res.json(successResponse(history))
})
