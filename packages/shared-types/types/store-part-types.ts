import { z } from 'zod';

const PART_NUMBER_PATTERN = /^[a-zA-Z0-9\-_.]+$/

// Base catalog shape (used by the Add Part combobox)
export const StorePartSchema = z.object({
  id: z.number(),
  part_number: z.string(),
  description: z.string()
})
export type StorePart = z.infer<typeof StorePartSchema>

// StorePart without its id — a part to be created on first purchase
export const CreateStorePartSchema = z.object({
  part_number: z.string().min(1).max(50).regex(PART_NUMBER_PATTERN, 'Invalid part number'),
  description: z.string().min(1)
})
export type CreateStorePart = z.infer<typeof CreateStorePartSchema>

// GET /store — one row per (part, warehouse)
export const StorePartSummarySchema = z.object({
  id: z.number(),
  part_number: z.string(),
  description: z.string(),
  warehouse_id: z.number(),
  warehouse_code: z.string(),
  on_hand: z.number().int(),
  last_updated: z.coerce.date()
})
export type StorePartSummary = z.infer<typeof StorePartSummarySchema>

// A ledger row within GET /store/:partNumber
export const StoreTransactionRowSchema = z.object({
  id: z.number(),
  store_transaction_number: z.string(),
  created_at: z.coerce.date(),
  warehouse_id: z.number(),
  warehouse_code: z.string(),
  type: z.string(),
  is_inbound: z.boolean(),
  quantity: z.number().int(),
  unit_cost: z.number().nullable(),
  departure_id: z.number().nullable(),
  departure_number: z.string().nullable(),
  asset_id: z.number().nullable(),
  asset_barcode: z.string().nullable(),
  created_by: z.string(),
  notes: z.string().nullable()
})
export type StoreTransactionRow = z.infer<typeof StoreTransactionRowSchema>

// GET /store/:partNumber — on_hand is derived on the frontend per selected warehouse
export const StorePartDetailSchema = z.object({
  id: z.number(),
  part_number: z.string(),
  description: z.string(),
  transactions: z.array(StoreTransactionRowSchema)
})
export type StorePartDetail = z.infer<typeof StorePartDetailSchema>

// POST /store — record an inbound purchase against an existing or new part
export const AddPurchaseSchema = z.object({
  part: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('existing'), store_part_id: z.number().int() }),
    z.object({ mode: z.literal('new') }).merge(CreateStorePartSchema)
  ]),
  warehouse_id: z.number().int(),
  quantity: z.number().int().positive(),
  unit_cost: z.number().nonnegative().nullable(),
  notes: z.string().nullable()
})
export type AddPurchase = z.infer<typeof AddPurchaseSchema>

export const AddPurchaseResponseSchema = z.object({
  store_transaction_number: z.string(),
  part_number: z.string()
})
export type AddPurchaseResponse = z.infer<typeof AddPurchaseResponseSchema>
