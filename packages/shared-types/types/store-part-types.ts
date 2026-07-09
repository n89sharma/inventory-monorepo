import { z } from 'zod'

const PART_NUMBER_PATTERN = /^[a-zA-Z0-9\-_.]+$/

// Base catalog shape (used by the Add Part combobox)
export const StorePartSchema = z.object({
  id: z.number(),
  part_number: z.string(),
  description: z.string(),
})
export type StorePart = z.infer<typeof StorePartSchema>

// StorePart without its id — a part to be created on first purchase
export const CreateStorePartSchema = z.object({
  part_number: z.string().min(1).max(50).regex(PART_NUMBER_PATTERN, 'Invalid part number'),
  description: z.string().min(1),
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
  last_purchase_unit_cost: z.number().nullable(),
  last_updated: z.coerce.date(),
})
export type StorePartSummary = z.infer<typeof StorePartSummarySchema>

// A ledger row within GET /store/:partId
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
  notes: z.string().nullable(),
})
export type StoreTransactionRow = z.infer<typeof StoreTransactionRowSchema>

// GET /store/:partId — on_hand is derived on the frontend per selected warehouse
export const StorePartDetailSchema = z.object({
  id: z.number(),
  part_number: z.string(),
  description: z.string(),
  transactions: z.array(StoreTransactionRowSchema),
})
export type StorePartDetail = z.infer<typeof StorePartDetailSchema>

// A store transaction is either a PURCHASE (inbound, adds stock) or a SALE
// (outbound, deducts stock). USED (asset consumption) is recorded separately.
export const StoreTransactionKindSchema = z.enum(['PURCHASE', 'SALE'])
export type StoreTransactionKind = z.infer<typeof StoreTransactionKindSchema>

// POST /store — record a PURCHASE or SALE against an existing part (a PURCHASE
// may also create the part on first receipt; a SALE requires an existing part)
export const RecordStoreTransactionSchema = z
  .object({
    kind: StoreTransactionKindSchema,
    part: z.discriminatedUnion('mode', [
      z.object({ mode: z.literal('existing'), store_part_id: z.number().int() }),
      z.object({ mode: z.literal('new') }).merge(CreateStorePartSchema),
    ]),
    warehouse_id: z.number().int(),
    quantity: z.number().int().positive(),
    unit_cost: z.number().nonnegative().nullable(),
    notes: z.string().nullable(),
  })
  .refine((body) => body.kind === 'PURCHASE' || body.part.mode === 'existing', {
    message: 'A sale requires an existing part',
    path: ['part'],
  })
export type RecordStoreTransaction = z.infer<typeof RecordStoreTransactionSchema>

export const StoreTransactionResponseSchema = z.object({
  store_transaction_number: z.string(),
  store_part_id: z.number(),
  part_number: z.string(),
})
export type StoreTransactionResponse = z.infer<typeof StoreTransactionResponseSchema>

// A store part consumed by an asset — rendered in the asset's Parts section
export const AssetStorePartRowSchema = z.object({
  store_part_id: z.number(),
  part_number: z.string(),
  description: z.string(),
  quantity: z.number().int(),
  estimated_cost: z.number(),
})
export type AssetStorePartRow = z.infer<typeof AssetStorePartRowSchema>

// POST /assets/:barcode/store-parts — consume a store part onto an asset (USED, outbound)
export const AddStorePartToAssetSchema = z.object({
  store_part_id: z.number().int(),
  warehouse_id: z.number().int(),
  quantity: z.number().int().positive(),
  unit_cost: z.number().positive(),
})
export type AddStorePartToAsset = z.infer<typeof AddStorePartToAssetSchema>
