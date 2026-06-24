import { Request, Response } from 'express'
import {
  ApiResponse,
  AssetDeltaSchema,
  CollectionHistory,
  CreateDepartureSchema,
  DepartureDetail,
  SetDepartureOutgoingStatusSchema,
  UpdateDepartureMetadataSchema,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { getDepartures as getDeparturesDb } from '../../generated/prisma/sql.js'
import { DepartureListQuerySchema } from '../middleware/validation.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createDeparture as createDepartureSer,
  getDeparture as getDepartureSer,
  addAssetsToDepartureAndRecord as patchDepartureAssetsSer,
  setDepartureOutgoingStatus as setDepartureOutgoingStatusSer,
  patchDepartureMetadata as patchDepartureMetadataSer,
} from '../services/departureService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

export const getDepartures = asyncHandler(async (req, res) => {
  const { fromDate, toDate, warehouse, customer } = res.locals.query as z.infer<
    typeof DepartureListQuerySchema
  >
  const departures = await prisma.$queryRawTyped(
    getDeparturesDb(fromDate, toDate, warehouse ?? 0, customer ?? 0),
  )
  res.json(successResponse(departures))
})

export const getDepartureDetail = asyncHandler(
  async (req: Request, res: Response<ApiResponse<DepartureDetail>>) => {
    const { departureNumber } = req.params
    const data = await getDepartureSer(departureNumber)
    res.json(successResponse(data))
  },
)

export const createDeparture = asyncHandler(async (req, res) => {
  const departure = CreateDepartureSchema.parse(req.body)
  const departureNumber = await createDepartureSer(departure, res.locals.dbUserId)
  res.status(201).json({ departureNumber })
})

export const patchDepartureAssets = asyncHandler(async (req, res) => {
  const delta = AssetDeltaSchema.parse(req.body)
  await patchDepartureAssetsSer(req.params.departureNumber, delta, res.locals.dbUserId)
  res.status(204).send()
})

export const setDepartureOutgoingStatus = asyncHandler(async (req, res) => {
  const { assetIds, outgoing_status } = SetDepartureOutgoingStatusSchema.parse(req.body)
  await setDepartureOutgoingStatusSer(
    req.params.departureNumber,
    assetIds,
    outgoing_status,
    res.locals.dbUserId,
  )
  res.status(204).send()
})

export const patchDepartureMetadata = asyncHandler(async (req, res) => {
  const metadata = UpdateDepartureMetadataSchema.parse(req.body)
  await patchDepartureMetadataSer(req.params.departureNumber, metadata, res.locals.dbUserId)
  res.status(204).send()
})

export const getDepartureHistory = asyncHandler(
  async (req: Request, res: Response<ApiResponse<CollectionHistory>>) => {
    const { departureNumber } = req.params
    const departure = await prisma.departure.findUnique({
      where: { departure_number: departureNumber },
      select: { id: true },
    })
    if (!departure) throw new NotFoundError(`Departure ${departureNumber} not found`)
    const history = await getCollectionHistorySer('Departure', departure.id)
    res.json(successResponse(history))
  },
)
