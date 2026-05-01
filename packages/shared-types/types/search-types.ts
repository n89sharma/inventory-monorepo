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

export const TransferSuggestionSchema = z.object({
  id: z.number(),
  transfer_number: z.string(),
  origin_code: z.string(),
  destination_code: z.string(),
  created_at: z.coerce.date(),
})

export type TransferSuggestion = z.infer<typeof TransferSuggestionSchema>

export const HoldSuggestionSchema = z.object({
  id: z.number(),
  hold_number: z.string(),
  customer: z.string(),
  created_for: z.string(),
  created_by: z.string(),
  created_at: z.coerce.date(),
})

export type HoldSuggestion = z.infer<typeof HoldSuggestionSchema>

export const InvoiceSuggestionSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  organization: z.string(),
  invoice_type: z.string(),
  created_at: z.coerce.date(),
})

export type InvoiceSuggestion = z.infer<typeof InvoiceSuggestionSchema>

export const GlobalSearchResultSchema = z.object({
  assets: z.array(BarcodeSuggestionSchema),
  arrivals: z.array(ArrivalSuggestionSchema),
  departures: z.array(DepartureSuggestionSchema),
  transfers: z.array(TransferSuggestionSchema),
  holds: z.array(HoldSuggestionSchema),
  invoices: z.array(InvoiceSuggestionSchema),
})

export type GlobalSearchResult = z.infer<typeof GlobalSearchResultSchema>
