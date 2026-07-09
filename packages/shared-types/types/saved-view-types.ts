import { z } from 'zod'

export const SAVED_VIEW_PAGE_KEYS = [
  'search_all',
  'search_instock',
  'search_held',
  'search_onhand',
  'search_sold',
  'sold_report',
  'report_profitability',
] as const

export const SavedViewPageKeySchema = z.enum(SAVED_VIEW_PAGE_KEYS)
export type SavedViewPageKey = z.infer<typeof SavedViewPageKeySchema>

const MAX_SAVED_COLUMNS = 100
const MAX_COLUMN_ID_LENGTH = 64

export const SavedViewSummarySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  page_key: SavedViewPageKeySchema,
  query_string: z.string(),
  column_ids: z.array(z.string()),
  created_at: z.coerce.date(),
})
export type SavedViewSummary = z.infer<typeof SavedViewSummarySchema>

export const CreateSavedViewSchema = z.object({
  name: z.string().min(1).max(100),
  page_key: SavedViewPageKeySchema,
  query_string: z.string().max(2000),
  column_ids: z.array(z.string().max(MAX_COLUMN_ID_LENGTH)).max(MAX_SAVED_COLUMNS).default([]),
})
export type CreateSavedView = z.infer<typeof CreateSavedViewSchema>
