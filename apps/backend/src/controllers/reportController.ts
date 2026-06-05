import { successResponse } from 'shared-types'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getProfitabilityCube as getProfitabilityCubeSer } from '../services/profitabilityService.js'

const MIN_YEAR = 2000
const MAX_YEAR = 2100

export const ProfitabilityReportQuerySchema = z.object({
  year: z.coerce.number().int().min(MIN_YEAR).max(MAX_YEAR),
})

export const getProfitabilityReport = asyncHandler(async (req, res) => {
  const { year } = res.locals.query as z.infer<typeof ProfitabilityReportQuerySchema>
  const data = await getProfitabilityCubeSer(year)
  res.json(successResponse(data))
})
