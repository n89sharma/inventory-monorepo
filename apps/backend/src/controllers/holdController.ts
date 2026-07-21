import { isAfter } from 'date-fns'
import { Request, Response } from 'express'
import {
  ApiResponse,
  AssetDeltaSchema,
  CollectionHistory,
  CreateHoldSchema,
  HoldDetail,
  HoldSummary,
  MoveHoldAssetsSchema,
  UpdateHoldMetadataSchema,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { getHolds as getHoldsDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { normalizeFromDate, normalizeToDate } from '../lib/date-range.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  archiveHold as archiveHoldSer,
  createHold as createHoldSer,
  getHold as getHoldSer,
  moveAssetsToHold as moveAssetsToHoldSer,
  addRemoveCollectionFromAssetsAndRecord as patchHoldAssetsSer,
  patchHoldMetadata as patchHoldMetadataSer,
} from '../services/holdService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

export const HoldQuerySchema = z
  .object({
    fromDate: z.string(),
    toDate: z.string().optional(),
    holdBy: z.coerce.number().int().optional(),
    holdFor: z.coerce.number().int().optional(),
    customer: z.coerce.number().int().optional(),
  })
  .transform((data) => ({
    fromDate: normalizeFromDate(data.fromDate),
    toDate: normalizeToDate(data.toDate),
    holdBy: data.holdBy,
    holdFor: data.holdFor,
    customer: data.customer,
  }))
  .refine((data) => !isAfter(data.fromDate, data.toDate), {
    message: 'fromDate must be before toDate',
  })

export const getHolds = asyncHandler(
  async (req: Request, res: Response<ApiResponse<HoldSummary[]>>) => {
    const { fromDate, toDate, holdBy, holdFor, customer } = res.locals.query as z.infer<
      typeof HoldQuerySchema
    >
    const holds = await prisma.$queryRawTyped(
      getHoldsDb(fromDate, toDate, holdBy ?? 0, holdFor ?? 0, customer ?? 0),
    )
    res.json(successResponse(holds))
  },
)

export const createHold = asyncHandler(async (req, res) => {
  const validated = CreateHoldSchema.parse(req.body)
  const holdNumber = await createHoldSer(validated, res.locals.dbUserId)
  res.status(201).json({ holdNumber })
})

export const patchHoldMetadata = asyncHandler(async (req, res) => {
  const metadata = UpdateHoldMetadataSchema.parse(req.body)
  await patchHoldMetadataSer(req.params.holdNumber, metadata, res.locals.dbUserId)
  res.status(204).send()
})

export const patchHoldAssets = asyncHandler(async (req, res) => {
  const delta = AssetDeltaSchema.parse(req.body)
  await patchHoldAssetsSer(req.params.holdNumber, delta, res.locals.dbUserId)
  res.status(204).send()
})

export const moveHoldAssets = asyncHandler(async (req, res) => {
  const { sourceHoldNumber, assetIds } = MoveHoldAssetsSchema.parse(req.body)
  await moveAssetsToHoldSer(sourceHoldNumber, req.params.holdNumber, assetIds, res.locals.dbUserId)
  res.status(204).send()
})

export const archiveHold = asyncHandler(async (req, res) => {
  await archiveHoldSer(req.params.holdNumber, res.locals.dbUserId)
  res.status(204).send()
})

export const getHoldDetail = asyncHandler(
  async (req: Request, res: Response<ApiResponse<HoldDetail>>) => {
    const { holdNumber } = req.params
    const data = await getHoldSer(holdNumber)
    res.json(successResponse(data))
  },
)

export const getHoldHistory = asyncHandler(
  async (req: Request, res: Response<ApiResponse<CollectionHistory>>) => {
    const { holdNumber } = req.params
    const hold = await prisma.hold.findUnique({
      where: { hold_number: holdNumber },
      select: { id: true },
    })
    if (!hold) throw new NotFoundError(`Hold ${holdNumber} not found`)
    const history = await getCollectionHistorySer('Hold', hold.id)
    res.json(successResponse(history))
  },
)
