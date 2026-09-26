import {
  AssetGroupSchema,
  BrandGroupSchema,
  DeleteMonthEndReportsSchema,
  UpdateMonthEndScheduleSchema,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import { toNumberArray } from '../lib/query-params.js'
import { getHeldReport as getHeldReportSer } from '../services/heldReportService.js'
import { getInStockSummaryReport as getInStockSummaryReportSer } from '../services/inStockSummaryService.js'
import { getModelPriceHistory as getModelPriceHistorySer } from '../services/modelPriceHistoryService.js'
import {
  createManualMonthEndReport as createManualMonthEndReportSer,
  deleteMonthEndReports as deleteMonthEndReportsSer,
  getMonthEndReport as getMonthEndReportSer,
  getMonthEndReports as getMonthEndReportsSer,
} from '../services/monthEndReportService.js'
import {
  getMonthEndSchedule as getMonthEndScheduleSer,
  updateMonthEndSchedule as updateMonthEndScheduleSer,
} from '../services/monthEndScheduleService.js'
import { getProfitabilityCube as getProfitabilityCubeSer } from '../services/profitabilityService.js'

const MIN_YEAR = 2000
const MAX_YEAR = 2100

export const ProfitabilityReportQuerySchema = z.object({
  year: z.coerce.number().int().min(MIN_YEAR).max(MAX_YEAR),
})

export const ModelPriceHistoryQuerySchema = z.object({
  modelId: z.coerce.number().int().positive(),
})

export const MonthEndReportQuerySchema = z.object({
  brandGroup: BrandGroupSchema.optional(),
  assetGroup: AssetGroupSchema.optional(),
  warehouseIds: z.preprocess(toNumberArray, z.array(z.coerce.number().int().positive())),
})

const MonthEndReportIdSchema = z.coerce.number().int().positive()

export const getMonthEndReports = asyncHandler(async (req, res) => {
  const data = await getMonthEndReportsSer()
  res.json(successResponse(data))
})

export const getMonthEndReport = asyncHandler(async (req, res) => {
  const id = MonthEndReportIdSchema.parse(req.params.id)
  const { brandGroup, assetGroup, warehouseIds } = res.locals.query as z.infer<
    typeof MonthEndReportQuerySchema
  >
  const data = await getMonthEndReportSer(id, { brandGroup, assetGroup, warehouseIds })
  res.json(successResponse(data))
})

export const createMonthEndReport = asyncHandler(async (req, res) => {
  const id = await createManualMonthEndReportSer(res.locals.dbUserId)
  res.status(201).json(successResponse({ id }))
})

export const deleteMonthEndReports = asyncHandler(async (req, res) => {
  const { ids } = DeleteMonthEndReportsSchema.parse(req.body)
  await deleteMonthEndReportsSer(ids)
  res.status(204).send()
})

export const getMonthEndSchedule = asyncHandler(async (req, res) => {
  const data = await getMonthEndScheduleSer()
  res.json(successResponse(data))
})

export const updateMonthEndSchedule = asyncHandler(async (req, res) => {
  const body = UpdateMonthEndScheduleSchema.parse(req.body)
  const data = await updateMonthEndScheduleSer(body, res.locals.dbUserId)
  res.json(successResponse(data))
})

export const getModelPriceHistory = asyncHandler(async (req, res) => {
  const { modelId } = res.locals.query as z.infer<typeof ModelPriceHistoryQuerySchema>
  const data = await getModelPriceHistorySer(modelId)
  res.json(successResponse(data))
})

export const getProfitabilityReport = asyncHandler(async (req, res) => {
  const { year } = res.locals.query as z.infer<typeof ProfitabilityReportQuerySchema>
  const data = await getProfitabilityCubeSer(year)
  res.json(successResponse(data))
})

export const getHeldReport = asyncHandler(async (req, res) => {
  const data = await getHeldReportSer()
  res.json(successResponse(data))
})

export const getInStockSummaryReport = asyncHandler(async (req, res) => {
  const data = await getInStockSummaryReportSer()
  res.json(successResponse(data))
})
