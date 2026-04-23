import { Request, Response } from 'express'
import { ApiResponse, GlobalSearchResult, response500, successResponse } from 'shared-types'
import { z } from 'zod'
import { searchArrivals, searchBarcodes } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export const GlobalSearchQuerySchema = z.object({
  q: z.string().min(1)
})

export async function globalSearch(req: Request, res: Response<ApiResponse<GlobalSearchResult>>) {
  try {
    const { q } = res.locals.query as z.infer<typeof GlobalSearchQuerySchema>
    const upper = q.toUpperCase()
    const [assets, arrivals] = await Promise.all([
      prisma.$queryRawTyped(searchBarcodes(upper)),
      prisma.$queryRawTyped(searchArrivals(upper)),
    ])
    res.json(successResponse({ assets, arrivals }))
  } catch {
    res.status(500).json(response500('Search failed'))
  }
}
