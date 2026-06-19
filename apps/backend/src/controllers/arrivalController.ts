import { Request, Response } from 'express'
import { ApiResponse, AssetDeltaSchema, CollectionHistory, CreateArrivalSchema, CreateAssetSchema, UpdateArrivalMetadataSchema, UpdateAssetSchema, successResponse } from 'shared-types'
import { z } from 'zod'
import { getArrivals as getArrivalsDb } from '../../generated/prisma/sql.js'
import { ArrivalListQuerySchema } from '../middleware/validation.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createArrival as createArrivalSer,
  createSingleArrivalAsset as createSingleArrivalAssetSer,
  getArrivalAssetForUpdate as getArrivalAssetForUpdateSer,
  getArrival as getArrivalSer,
  addRemoveCollectionFromAssetsAndRecord as patchArrivalAssetsSer,
  patchArrivalMetadata as patchArrivalMetadataSer,
  updateArrivalAsset as updateArrivalAssetSer
} from '../services/arrivalService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

export const getArrivals = asyncHandler(async (req, res) => {
  const { fromDate, toDate, warehouse, vendor } =
    res.locals.query as z.infer<typeof ArrivalListQuerySchema>
  const arrivals = await prisma.$queryRawTyped(
    getArrivalsDb(fromDate, toDate, warehouse ?? 0, vendor ?? 0)
  )
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

export const patchArrivalMetadata = asyncHandler(async (req, res) => {
  const metadata = UpdateArrivalMetadataSchema.parse(req.body)
  await patchArrivalMetadataSer(req.params.arrivalNumber, metadata, res.locals.dbUserId)
  res.status(204).send()
})

export const patchArrivalAssets = asyncHandler(async (req, res) => {
  const delta = AssetDeltaSchema.parse(req.body)
  await patchArrivalAssetsSer(req.params.arrivalNumber, delta, res.locals.dbUserId)
  res.status(204).send()
})

export const createSingleArrivalAsset = asyncHandler(async (req, res) => {
  const validated = CreateAssetSchema.parse(req.body)
  const asset = await createSingleArrivalAssetSer(req.params.arrivalNumber, validated, res.locals.dbUserId)
  res.status(201).json(successResponse(asset))
})

export const getArrivalAssetForUpdate = asyncHandler(async (req, res) => {
  const assetId = Number(req.params.assetId)
  const data = await getArrivalAssetForUpdateSer(req.params.arrivalNumber, assetId)
  res.json(successResponse(data))
})

export const updateArrivalAsset = asyncHandler(async (req, res) => {
  const assetId = Number(req.params.assetId)
  const validated = UpdateAssetSchema.parse(req.body)
  const asset = await updateArrivalAssetSer(req.params.arrivalNumber, assetId, validated, res.locals.dbUserId)
  res.json(successResponse(asset))
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
