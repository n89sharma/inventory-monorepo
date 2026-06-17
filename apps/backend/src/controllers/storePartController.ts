import { AddPurchaseSchema, AddStorePartToAssetSchema, successResponse } from 'shared-types'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  addPurchase as addPurchaseSer,
  addStorePartToAsset as addStorePartToAssetSer,
  getAssetStoreParts as getAssetStorePartsSer,
  getStorePart as getStorePartSer,
  getStoreParts as getStorePartsSer
} from '../services/storePartService.js'

export const getStoreParts = asyncHandler(async (_req, res) => {
  const parts = await getStorePartsSer()
  res.json(successResponse(parts))
})

export const getStorePart = asyncHandler(async (req, res) => {
  const data = await getStorePartSer(req.params.partNumber)
  res.json(successResponse(data))
})

export const addPurchase = asyncHandler(async (req, res) => {
  const validated = AddPurchaseSchema.parse(req.body)
  const result = await addPurchaseSer(validated, res.locals.dbUserId)
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
