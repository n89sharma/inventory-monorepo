import { SEARCH_ENTITY_TYPES, successResponse } from 'shared-types'
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

const toArray = (val: unknown) => {
  if (val === undefined) return undefined
  return Array.isArray(val) ? val : [val]
}

export const GlobalSearchQuerySchema = z.object({
  q: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_.]*$/),
  types: z.preprocess(toArray, z.array(z.enum(SEARCH_ENTITY_TYPES)).optional()),
})

export const globalSearch = asyncHandler(async (req, res) => {
  const { q, types } = res.locals.query as z.infer<typeof GlobalSearchQuerySchema>
  const upper = q.toUpperCase()
  const normalized = normalizeForSearch(q)
  const wanted = new Set(types ?? SEARCH_ENTITY_TYPES)
  const [assets, arrivals, departures, transfers, holds, invoices] = await Promise.all([
    wanted.has('assets') && normalized
      ? prisma.$queryRawTyped(searchBarcodes(normalized))
      : Promise.resolve([]),
    wanted.has('arrivals') ? prisma.$queryRawTyped(searchArrivals(upper)) : Promise.resolve([]),
    wanted.has('departures') ? prisma.$queryRawTyped(searchDepartures(upper)) : Promise.resolve([]),
    wanted.has('transfers') ? prisma.$queryRawTyped(searchTransfers(upper)) : Promise.resolve([]),
    wanted.has('holds') ? prisma.$queryRawTyped(searchHolds(upper)) : Promise.resolve([]),
    wanted.has('invoices') && normalized
      ? prisma.$queryRawTyped(searchInvoices(normalized))
      : Promise.resolve([]),
  ])
  res.json(successResponse({ assets, arrivals, departures, transfers, holds, invoices }))
})
