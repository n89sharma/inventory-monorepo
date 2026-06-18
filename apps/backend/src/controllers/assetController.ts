import { isAfter, subMonths } from 'date-fns'
import { Request, Response } from 'express'
import { ApiResponse, AssetSummary, BarcodeSuggestion, BulkUpdateAssetPricingSchema, CreateCommentSchema, CreateSalvagedPartSchema, ExportAssetsSchema, UpdateAssetErrorsSchema, UpdateAssetLocationSchema, UpdateAssetPricingSchema, UpdateAssetSpecsSchema, successResponse } from 'shared-types'
import { z } from 'zod'
import { getAssetByBarcode, searchBarcodes } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError, ValidationError } from '../lib/errors.js'
import { normalizeForSearch } from '../lib/search.js'
import { prisma } from '../prisma.js'
import { mapAssetSummary } from '../lib/asset-mappers.js'
import {
  getAccessories as getAssetAccessoriesSer,
  getComments as getAssetCommentsSer,
  getAssetDetail as getAssetDetailSer,
  getErrors as getAssetErrorsSer,
  getAssetHistory as getAssetHistorySer,
  getAssetHarvestedParts as getAssetHarvestedPartsSer,
  getTransfers as getAssetTransfersSer,
  getAssetsForSearchInStock as getAssetsForSearchInStockSer,
  getAssetsForSearchHeld as getAssetsForSearchHeldSer,
  getAssets as getAssetsSer,
  getSoldAssets as getSoldAssetsSer
} from '../services/assetReadService.js'
import { exportAssetReport as exportAssetReportSer } from '../services/assetReportService.js'
import {
  bulkUpdateAssetPricing as bulkUpdateAssetPricingSer,
  updateAssetPricing as updateAssetPricingSer
} from '../services/assetPricingService.js'
import { updateAssetErrors as updateAssetErrorsSer } from '../services/assetErrorService.js'
import { createComment as createCommentSer } from '../services/assetCommentService.js'
import {
  getLocationsByWarehouse as getLocationsByWarehouseSer,
  updateAssetLocation as updateAssetLocationSer
} from '../services/assetLocationService.js'
import { updateAssetSpecs as updateAssetSpecsSer } from '../services/assetSpecsService.js'
import { createAssetSalvagedPart as createAssetSalvagedPartSer } from '../services/assetPartService.js'

export const BarcodeSuggestionsQuerySchema = z.object({
  q: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\s\-_.]*$/)
})

export const LocationsByWarehouseQuerySchema = z.object({
  warehouseId: z.string().transform(Number)
})

const toNumberArray = (val: unknown) =>
  val === undefined ? [] : Array.isArray(val) ? val : [val]

export const AssetQuerySchema = z.object({
  model: z.string().min(4).max(100).regex(/^[a-zA-Z0-9\s\-_.]+$/).optional(),
  statusIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  readinessIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  warehouseIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  brandIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  assetTypeIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  meterMin: z.string().optional().transform(Number),
  meterMax: z.string().optional().transform(Number),
  cassettes: z.string().optional().transform(Number),
  componentId: z.string().optional().transform(Number),
  customerId: z.string().optional().transform(Number),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional()
})

const MAX_DEPARTED_WINDOW_MONTHS = 18

function resolveDepartedRange(
  fromDate: Date | undefined,
  toDate: Date | undefined,
): { departedFrom: Date | null; departedTo: Date | null } {
  if (!fromDate) return { departedFrom: null, departedTo: null }
  const floor = subMonths(new Date(), MAX_DEPARTED_WINDOW_MONTHS)
  const departedFrom = isAfter(floor, fromDate) ? floor : fromDate
  const departedTo = toDate ?? new Date()
  if (isAfter(departedFrom, departedTo)) {
    throw new ValidationError('fromDate must be before toDate')
  }
  return { departedFrom, departedTo }
}

export const getAssets = asyncHandler(async (req, res) => {
  const {
    model, statusIds, readinessIds, warehouseIds, brandIds, assetTypeIds,
    meterMin, meterMax, cassettes, componentId, customerId, fromDate, toDate
  } = res.locals.query as z.infer<typeof AssetQuerySchema>
  const { departedFrom, departedTo } = resolveDepartedRange(fromDate, toDate)
  const data = await getAssetsSer(
    model ?? '',
    statusIds,
    readinessIds,
    warehouseIds,
    isNaN(meterMin) ? -1 : meterMin,
    isNaN(meterMax) ? -1 : meterMax,
    isNaN(cassettes) ? -1 : cassettes,
    isNaN(componentId) ? -1 : componentId,
    brandIds,
    assetTypeIds,
    departedFrom,
    departedTo,
    isNaN(customerId) ? -1 : customerId,
    -1,
    -1,
    -1,
    res.locals.dbUserRole,
  )
  res.json(successResponse(data))
})

export const SoldAssetQuerySchema = z.object({
  model: z.string().min(4).max(100).regex(/^[a-zA-Z0-9\s\-_.]+$/).optional(),
  statusIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  readinessIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  warehouseIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  brandIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  assetTypeIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  meterMin: z.string().optional().transform(Number),
  meterMax: z.string().optional().transform(Number),
  cassettes: z.string().optional().transform(Number),
  componentId: z.string().optional().transform(Number),
  customerId: z.string().optional().transform(Number),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date()
})

function resolveSoldRange(
  fromDate: Date,
  toDate: Date,
): { departedFrom: Date; departedTo: Date } {
  const floor = subMonths(new Date(), MAX_DEPARTED_WINDOW_MONTHS)
  const departedFrom = isAfter(floor, fromDate) ? floor : fromDate
  if (isAfter(departedFrom, toDate)) {
    throw new ValidationError('fromDate must be before toDate')
  }
  return { departedFrom, departedTo: toDate }
}

export const getSoldAssets = asyncHandler(async (req, res) => {
  const {
    model, statusIds, readinessIds, warehouseIds, brandIds, assetTypeIds,
    meterMin, meterMax, cassettes, componentId, customerId, fromDate, toDate
  } = res.locals.query as z.infer<typeof SoldAssetQuerySchema>
  const { departedFrom, departedTo } = resolveSoldRange(fromDate, toDate)
  const data = await getSoldAssetsSer(
    model ?? '',
    statusIds,
    readinessIds,
    warehouseIds,
    isNaN(meterMin) ? -1 : meterMin,
    isNaN(meterMax) ? -1 : meterMax,
    isNaN(cassettes) ? -1 : cassettes,
    isNaN(componentId) ? -1 : componentId,
    brandIds,
    assetTypeIds,
    departedFrom,
    departedTo,
    isNaN(customerId) ? -1 : customerId,
    res.locals.dbUserRole,
  )
  res.json(successResponse(data))
})

export const SearchInStockQuerySchema = z.object({
  warehouseIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number)))
    .refine(ids => ids.length > 0, { message: 'At least one warehouse is required' }),
  brandIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  assetTypeIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  readinessIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  model: z.string().min(4).max(100).regex(/^[a-zA-Z0-9\s\-_.]+$/).optional(),
  meterMin: z.string().optional().transform(Number),
  meterMax: z.string().optional().transform(Number),
  cassettes: z.string().optional().transform(Number),
  componentId: z.string().optional().transform(Number),
})

export const getAssetsForSearchInStock = asyncHandler(async (req, res) => {
  const {
    warehouseIds, brandIds, assetTypeIds, readinessIds, model,
    meterMin, meterMax, cassettes, componentId
  } = res.locals.query as z.infer<typeof SearchInStockQuerySchema>
  const data = await getAssetsForSearchInStockSer(
    warehouseIds,
    brandIds,
    assetTypeIds,
    readinessIds,
    model ?? '',
    isNaN(meterMin) ? -1 : meterMin,
    isNaN(meterMax) ? -1 : meterMax,
    isNaN(cassettes) ? -1 : cassettes,
    isNaN(componentId) ? -1 : componentId,
    res.locals.dbUserRole,
  )
  res.json(successResponse(data))
})

export const SearchHeldQuerySchema = z.object({
  warehouseIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number)))
    .refine(ids => ids.length > 0, { message: 'At least one warehouse is required' }),
  brandIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  assetTypeIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  readinessIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  model: z.string().min(4).max(100).regex(/^[a-zA-Z0-9\s\-_.]+$/).optional(),
  meterMin: z.string().optional().transform(Number),
  meterMax: z.string().optional().transform(Number),
  cassettes: z.string().optional().transform(Number),
  componentId: z.string().optional().transform(Number),
  heldById: z.string().optional().transform(Number),
  heldForId: z.string().optional().transform(Number),
  holdCustomerId: z.string().optional().transform(Number),
})

export const getAssetsForSearchHeld = asyncHandler(async (req, res) => {
  const {
    warehouseIds, brandIds, assetTypeIds, readinessIds, model,
    meterMin, meterMax, cassettes, componentId, heldById, heldForId, holdCustomerId
  } = res.locals.query as z.infer<typeof SearchHeldQuerySchema>
  const data = await getAssetsForSearchHeldSer(
    warehouseIds,
    brandIds,
    assetTypeIds,
    readinessIds,
    model ?? '',
    isNaN(meterMin) ? -1 : meterMin,
    isNaN(meterMax) ? -1 : meterMax,
    isNaN(cassettes) ? -1 : cassettes,
    isNaN(componentId) ? -1 : componentId,
    isNaN(heldById) ? -1 : heldById,
    isNaN(heldForId) ? -1 : heldForId,
    isNaN(holdCustomerId) ? -1 : holdCustomerId,
    res.locals.dbUserRole,
  )
  res.json(successResponse(data))
})

export const getAssetDetail = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetDetailSer(barcode, res.locals.dbUserRole)
  res.json(successResponse(data))
})

export const getAssetAccessories = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetAccessoriesSer(barcode)
  res.json(successResponse(data))
})

export const getAssetErrors = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetErrorsSer(barcode)
  res.json(successResponse(data))
})

export const getAssetComments = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetCommentsSer(barcode)
  res.json(successResponse(data))
})

export const getAssetHarvestedParts = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetHarvestedPartsSer(barcode)
  res.json(successResponse(data))
})

export const getAssetTransfers = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetTransfersSer(barcode)
  res.json(successResponse(data))
})

export const getAssetHistory = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetHistorySer(barcode, res.locals.dbUserRole)
  res.json(successResponse(data))
})

export const getAssetSummaryByBarcode = asyncHandler(async (req: Request, res: Response<ApiResponse<AssetSummary>>) => {
  const { barcode } = req.params
  const results = await prisma.$queryRawTyped(getAssetByBarcode(barcode))
  if (results.length === 0) throw new NotFoundError(`Asset ${barcode} not found`)
  res.json(successResponse(mapAssetSummary(results[0])))
})

export const createAssetComment = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = CreateCommentSchema.parse(req.body)
  await createCommentSer(barcode, validated, res.locals.dbUserId)
  res.status(201).json(successResponse(null))
})

export const createAssetHarvestedPart = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = CreateSalvagedPartSchema.parse(req.body)
  await createAssetSalvagedPartSer(barcode, validated, res.locals.dbUserId)
  res.status(201).json(successResponse(null))
})

export const updateAssetErrors = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = UpdateAssetErrorsSchema.parse(req.body)
  await updateAssetErrorsSer(barcode, validated, res.locals.dbUserId)
  res.json(successResponse(null))
})

export const updateAssetPricing = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = UpdateAssetPricingSchema.parse(req.body)
  await updateAssetPricingSer(barcode, validated, res.locals.dbUserId)
  res.json(successResponse(null))
})

export const bulkUpdateAssetPricing = asyncHandler(async (req, res) => {
  const { items } = BulkUpdateAssetPricingSchema.parse(req.body)
  await bulkUpdateAssetPricingSer(items, res.locals.dbUserId)
  res.json(successResponse(null))
})

export const updateAssetSpecs = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = UpdateAssetSpecsSchema.parse(req.body)
  await updateAssetSpecsSer(barcode, validated, res.locals.dbUserId)
  res.json(successResponse(null))
})

export const getLocationsByWarehouse = asyncHandler(async (req, res) => {
  const { warehouseId } = res.locals.query as z.infer<typeof LocationsByWarehouseQuerySchema>
  const data = await getLocationsByWarehouseSer(warehouseId)
  res.json(successResponse(data))
})

export const updateAssetLocation = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = UpdateAssetLocationSchema.parse(req.body)
  await updateAssetLocationSer(barcode, validated, res.locals.dbUserId)
  res.json(successResponse(null))
})

export const exportAssetReport = asyncHandler(async (req, res) => {
  const { barcodes, variant, columnKeys } = ExportAssetsSchema.parse(req.body)
  const csv = await exportAssetReportSer(barcodes, res.locals.dbUserRole, variant, columnKeys)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="assets-export-${timestamp}.csv"`)
  res.send(csv)
})

export const getBarcodeSuggestions = asyncHandler(async (req: Request, res: Response<ApiResponse<BarcodeSuggestion[]>>) => {
  const { q } = res.locals.query as z.infer<typeof BarcodeSuggestionsQuerySchema>
  const normalized = normalizeForSearch(q)
  if (!normalized) {
    res.json(successResponse([]))
    return
  }
  const results = await prisma.$queryRawTyped(searchBarcodes(normalized))
  res.json(successResponse(results))
})
