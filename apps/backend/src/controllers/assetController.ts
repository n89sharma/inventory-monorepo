import { Request, Response } from 'express'
import { ApiResponse, AssetSummary, BulkUpdateAssetPricingSchema, CreateCommentSchema, CreatePartTransferSchema, BarcodeSuggestion, UpdateAssetErrorsSchema, UpdateAssetLocationSchema, UpdateAssetPricingSchema, UpdateAssetSpecsSchema, successResponse } from 'shared-types'
import { z } from 'zod'
import { getAssetByBarcode, searchBarcodes } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  getAssets as getAssetsSer,
  getAccessories as getAssetAccessoriesSer,
  getComments as getAssetCommentsSer,
  getAssetDetail as getAssetDetailSer,
  getErrors as getAssetErrorsSer,
  getAssetHistory as getAssetHistorySer,
  getAssetPartTransfer as getAssetPartTransferSer,
  getTransfers as getAssetTransfersSer,
  createComment as createCommentSer,
  createPartTransfer as createPartTransferSer,
  exportAssets as exportAssetsSer,
  updateAssetErrors as updateAssetErrorsSer,
  updateAssetLocation as updateAssetLocationSer,
  updateAssetPricing as updateAssetPricingSer,
  bulkUpdateAssetPricing as bulkUpdateAssetPricingSer,
  updateAssetSpecs as updateAssetSpecsSer,
  getLocationsByWarehouse as getLocationsByWarehouseSer
} from '../services/assetService.js'

export const BarcodeSuggestionsQuerySchema = z.object({
  q: z.string().min(1)
})

export const LocationsByWarehouseQuerySchema = z.object({
  warehouseId: z.string().transform(Number)
})

const toNumberArray = (val: unknown) =>
  val === undefined ? [] : Array.isArray(val) ? val : [val]

export const AssetQuerySchema = z.object({
  model: z.string(),
  trackingStatusId: z.string().optional().transform(Number),
  availabilityStatusIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  technicalStatusIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  warehouseIds: z.preprocess(toNumberArray, z.array(z.string().transform(Number))),
  meter: z.string().optional().transform(Number)
})

export const getAssets = asyncHandler(async (req, res) => {
  const {
    model, trackingStatusId, availabilityStatusIds, technicalStatusIds, warehouseIds, meter
  } = res.locals.query as z.infer<typeof AssetQuerySchema>
  const data = await getAssetsSer(
    model,
    isNaN(trackingStatusId) ? 0 : trackingStatusId,
    availabilityStatusIds,
    technicalStatusIds,
    warehouseIds,
    isNaN(meter) ? -1 : meter
  )
  res.json(successResponse(data))
})

export const getAssetDetail = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetDetailSer(barcode)
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

export const getAssetPartTransfer = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetPartTransferSer(barcode)
  res.json(successResponse(data))
})

export const getAssetTransfers = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetTransfersSer(barcode)
  res.json(successResponse(data))
})

export const getAssetHistory = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const data = await getAssetHistorySer(barcode)
  res.json(successResponse(data))
})

export const getAssetSummaryByBarcode = asyncHandler(async (req: Request, res: Response<ApiResponse<AssetSummary>>) => {
  const { barcode } = req.params
  const results = await prisma.$queryRawTyped(getAssetByBarcode(barcode))
  if (results.length === 0) throw new NotFoundError(`Asset ${barcode} not found`)
  res.json(successResponse(results[0]))
})

export const createAssetComment = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = CreateCommentSchema.parse(req.body)
  await createCommentSer(barcode, validated, res.locals.dbUserId)
  res.status(201).json(successResponse(null))
})

export const createPartTransfer = asyncHandler(async (req, res) => {
  const { barcode } = req.params
  const validated = CreatePartTransferSchema.parse(req.body)
  await createPartTransferSer(barcode, validated, res.locals.dbUserId)
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

export const ExportAssetsSchema = z.object({
  barcodes: z.array(z.string()).min(1).max(2000)
})

export const exportAssets = asyncHandler(async (req, res) => {
  const { barcodes } = ExportAssetsSchema.parse(req.body)
  const csv = await exportAssetsSer(barcodes)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="assets-export-${timestamp}.csv"`)
  res.send(csv)
})

export const getBarcodeSuggestions = asyncHandler(async (req: Request, res: Response<ApiResponse<BarcodeSuggestion[]>>) => {
  const { q } = res.locals.query as z.infer<typeof BarcodeSuggestionsQuerySchema>
  const results = await prisma.$queryRawTyped(searchBarcodes(q.toUpperCase()))
  res.json(successResponse(results))
})
