import { z } from 'zod'
import { BarcodeSuggestionSchema } from './asset-types.js'

export const ArrivalSuggestionSchema = z.object({
  id: z.number(),
  arrival_number: z.string(),
  vendor: z.string(),
  warehouse_code: z.string(),
  created_at: z.coerce.date(),
})

export type ArrivalSuggestion = z.infer<typeof ArrivalSuggestionSchema>

export const DepartureSuggestionSchema = z.object({
  id: z.number(),
  departure_number: z.string(),
  origin_code: z.string(),
  destination: z.string(),
  created_at: z.coerce.date(),
})

export type DepartureSuggestion = z.infer<typeof DepartureSuggestionSchema>

export const GlobalSearchResultSchema = z.object({
  assets: z.array(BarcodeSuggestionSchema),
  arrivals: z.array(ArrivalSuggestionSchema),
  departures: z.array(DepartureSuggestionSchema),
})

export type GlobalSearchResult = z.infer<typeof GlobalSearchResultSchema>
