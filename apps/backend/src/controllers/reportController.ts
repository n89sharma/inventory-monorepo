import { successResponse } from 'shared-types'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getHeldReport as getHeldReportSer } from '../services/heldReportService.js'
import { getInStockSummaryReport as getInStockSummaryReportSer } from '../services/inStockSummaryService.js'
import { getModelPriceHistory as getModelPriceHistorySer } from '../services/modelPriceHistoryService.js'
import { getProfitabilityCube as getProfitabilityCubeSer } from '../services/profitabilityService.js'

const MIN_YEAR = 2000
const MAX_YEAR = 2100

export const ProfitabilityReportQuerySchema = z.object({
  year: z.coerce.number().int().min(MIN_YEAR).max(MAX_YEAR),
})

export const ModelPriceHistoryQuerySchema = z.object({
  modelId: z.coerce.number().int().positive(),
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
