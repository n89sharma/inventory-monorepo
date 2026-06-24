import { successResponse } from 'shared-types'
import { z } from 'zod'
import {
  searchArrivals,
  searchBarcodes,
  searchDepartures,
  searchHolds,
  searchInvoices,
  searchTransfers,
} from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { normalizeForSearch } from '../lib/search.js'
import { prisma } from '../prisma.js'
import { getModelSales as getModelSalesSer } from '../services/modelSalesService.js'

export const GlobalSearchQuerySchema = z.object({
  q: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_.]*$/),
})

export const ModelSalesQuerySchema = z.object({
  modelId: z.coerce.number().int().positive(),
})

export const getModelSales = asyncHandler(async (req, res) => {
  const { modelId } = res.locals.query as z.infer<typeof ModelSalesQuerySchema>
  const data = await getModelSalesSer(modelId)
  res.json(successResponse(data))
})

export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = res.locals.query as z.infer<typeof GlobalSearchQuerySchema>
  const upper = q.toUpperCase()
  const normalized = normalizeForSearch(q)
  const [assets, arrivals, departures, transfers, holds, invoices] = await Promise.all([
    normalized ? prisma.$queryRawTyped(searchBarcodes(normalized)) : Promise.resolve([]),
    prisma.$queryRawTyped(searchArrivals(upper)),
    prisma.$queryRawTyped(searchDepartures(upper)),
    prisma.$queryRawTyped(searchTransfers(upper)),
    prisma.$queryRawTyped(searchHolds(upper)),
    prisma.$queryRawTyped(searchInvoices(upper)),
  ])
  res.json(successResponse({ assets, arrivals, departures, transfers, holds, invoices }))
})
