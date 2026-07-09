import {
  RecordStoreTransactionSchema,
  AddStorePartToAssetSchema,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  recordStoreTransaction as recordStoreTransactionSer,
  addStorePartToAsset as addStorePartToAssetSer,
  getAssetStoreParts as getAssetStorePartsSer,
  getStorePart as getStorePartSer,
  getStoreParts as getStorePartsSer,
} from '../services/storePartService.js'

export const getStoreParts = asyncHandler(async (_req, res) => {
  const parts = await getStorePartsSer()
  res.json(successResponse(parts))
})

const PartIdSchema = z.coerce.number().int().positive()

export const getStorePart = asyncHandler(async (req, res) => {
  const partId = PartIdSchema.parse(req.params.partId)
  const data = await getStorePartSer(partId)
  res.json(successResponse(data))
})

export const recordStoreTransaction = asyncHandler(async (req, res) => {
  const validated = RecordStoreTransactionSchema.parse(req.body)
  const result = await recordStoreTransactionSer(validated, res.locals.dbUserId)
  res.status(201).json(result)
})

export const getAssetStoreParts = asyncHandler(async (req, res) => {
  const data = await getAssetStorePartsSer(req.params.barcode)
  res.json(successResponse(data))
})

export const addStorePartToAsset = asyncHandler(async (req, res) => {
  const validated = AddStorePartToAssetSchema.parse(req.body)
  const result = await addStorePartToAssetSer(req.params.barcode, validated, res.locals.dbUserId)
  res.status(201).json(result)
})
