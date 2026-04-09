import { isAfter } from 'date-fns'
import { NextFunction, Request, Response } from 'express'
import { ApiResponse, CreateHoldSchema, HoldDetail, HoldSummary, response500, successResponse } from 'shared-types'
import { z } from 'zod'
import { getHolds as getHoldsDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { createHold as createHoldSer, getHold as getHoldSer } from '../services/holdService.js'

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

export async function getHolds(req: Request, res: Response<ApiResponse<HoldSummary[]>>) {
  try {
    const { fromDate, toDate, holdBy, holdFor } = res.locals.query as z.infer<typeof HoldQuerySchema>
    const holds = await prisma.$queryRawTyped(getHoldsDb(fromDate, toDate, holdBy ?? 0, holdFor ?? 0))
    res.json(successResponse(holds))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch holds'))
  }
}

export async function createHold(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = CreateHoldSchema.parse(req.body)
    const response = await createHoldSer(validated)
    if (response.success) {
      return res.status(201).json({ holdNumber: response.data })
    }
    if (response.error.status === 400) {
      return res.status(400).json(response)
    }
    return res.status(500).json(response)
  } catch (error) {
    next(error)
  }
}

export async function getHoldDetail(req: Request, res: Response<ApiResponse<HoldDetail>>) {
  const { holdNumber } = req.params
  const response = await getHoldSer(holdNumber)
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
