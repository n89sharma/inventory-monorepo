import { Request, Response } from 'express'
import { ApiResponse, GlobalSearchResult, response500, successResponse } from 'shared-types'
import { z } from 'zod'
import { searchArrivals, searchBarcodes, searchDepartures, searchHolds, searchInvoices, searchTransfers } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export const GlobalSearchQuerySchema = z.object({
  q: z.string().min(1)
})

export async function globalSearch(req: Request, res: Response<ApiResponse<GlobalSearchResult>>) {
  try {
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
  } catch {
    res.status(500).json(response500('Search failed'))
  }
}
