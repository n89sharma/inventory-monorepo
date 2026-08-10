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

// GET /store — one row per (part, warehouse). stock_value is the FIFO value of the
// on-hand quantity, withheld (null) from users without view_purchase_price.
export const StorePartSummarySchema = z.object({
  id: z.number(),
  part_number: z.string(),
  description: z.string(),
  warehouse_id: z.number(),
  warehouse_code: z.string(),
  on_hand: z.number().int(),
  stock_value: z.number().nullable(),
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

// One warehouse holding a part. stock_value is the FIFO value of on_hand, withheld
// (null) from users without view_purchase_price; on_hand is never withheld.
export const StorePartWarehouseStockSchema = z.object({
  warehouse_id: z.number(),
  on_hand: z.number().int(),
  stock_value: z.number().nullable(),
})
export type StorePartWarehouseStock = z.infer<typeof StorePartWarehouseStockSchema>

// GET /store/:partId — stock carries one entry per warehouse the part has moved through
export const StorePartDetailSchema = z.object({
  id: z.number(),
  part_number: z.string(),
  description: z.string(),
  stock: z.array(StorePartWarehouseStockSchema),
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

// POST /store/:partId/revaluation — restate the carrying value of the stock on hand in
// one warehouse. Quantity is never supplied: the ledger's on-hand is the only authority,
// so a revaluation always covers exactly what is held at the moment it is recorded.
export const RevalueStorePartSchema = z.object({
  warehouse_id: z.number().int(),
  unit_cost: z.number().nonnegative(),
  notes: z.string().nullable(),
})
export type RevalueStorePart = z.infer<typeof RevalueStorePartSchema>

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

// POST /assets/:barcode/store-parts — consume a store part onto an asset (USED, outbound).
// The cost is derived from the FIFO ledger on the backend, never supplied by the client.
export const AddStorePartToAssetSchema = z.object({
  store_part_id: z.number().int(),
  warehouse_id: z.number().int(),
  quantity: z.number().int().positive(),
})
export type AddStorePartToAsset = z.infer<typeof AddStorePartToAssetSchema>
