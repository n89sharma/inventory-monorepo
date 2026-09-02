import {
  RecordStoreTransactionSchema,
  AddStorePartToAssetSchema,
  RevalueStorePartSchema,
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
  revalueStorePart as revalueStorePartSer,
} from '../services/storePartService.js'

// view_store alone reaches shipping and tech, who may not see purchase costs.
const VIEW_COST_PERMISSION = 'view_purchase_price'

export const getStoreParts = asyncHandler(async (_req, res) => {
  const parts = await getStorePartsSer(res.locals.permissions.has(VIEW_COST_PERMISSION))
  res.json(successResponse(parts))
})

const PartIdSchema = z.coerce.number().int().positive()

export const getStorePart = asyncHandler(async (req, res) => {
  const partId = PartIdSchema.parse(req.params.partId)
  const data = await getStorePartSer(partId, res.locals.permissions.has(VIEW_COST_PERMISSION))
  res.json(successResponse(data))
})

export const recordStoreTransaction = asyncHandler(async (req, res) => {
  const validated = RecordStoreTransactionSchema.parse(req.body)
  const result = await recordStoreTransactionSer(validated, res.locals.dbUserId)
  res.status(201).json(result)
})

export const revalueStorePart = asyncHandler(async (req, res) => {
  const partId = PartIdSchema.parse(req.params.partId)
  const validated = RevalueStorePartSchema.parse(req.body)
  const result = await revalueStorePartSer(partId, validated, res.locals.dbUserId)
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
