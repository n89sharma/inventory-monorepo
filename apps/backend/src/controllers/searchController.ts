import { successResponse } from 'shared-types'
import { z } from 'zod'
import { searchArrivals, searchBarcodes, searchDepartures, searchHolds, searchInvoices, searchTransfers } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { prisma } from '../prisma.js'

export const GlobalSearchQuerySchema = z.object({
  q: z.string().min(1)
})

export const globalSearch = asyncHandler(async (req, res) => {
  const { q } = res.locals.query as z.infer<typeof GlobalSearchQuerySchema>
  const upper = q.toUpperCase()
  const [assets, arrivals, departures, transfers, holds, invoices] = await Promise.all([
    prisma.$queryRawTyped(searchBarcodes(upper)),
    prisma.$queryRawTyped(searchArrivals(upper)),
    prisma.$queryRawTyped(searchDepartures(upper)),
    prisma.$queryRawTyped(searchTransfers(upper)),
    prisma.$queryRawTyped(searchHolds(upper)),
    prisma.$queryRawTyped(searchInvoices(upper)),
  ])
  res.json(successResponse({ assets, arrivals, departures, transfers, holds, invoices }))
})
