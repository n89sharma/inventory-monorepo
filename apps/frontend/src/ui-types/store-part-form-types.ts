import {
  CreateStorePartSchema,
  StorePartSchema,
  StorePartSummarySchema,
  StoreTransactionKindSchema,
  WarehouseSchema,
} from 'shared-types'
import { z } from 'zod'

// kind: PURCHASE adds stock, SALE deducts it.
// part: an existing StorePart (has id), a new CreateStorePart (no id), or nothing yet.
// A SALE requires an existing part — you cannot sell a part that isn't stocked.
export const StoreTransactionFormSchema = z
  .object({
    kind: StoreTransactionKindSchema,
    part: z.union([StorePartSchema, CreateStorePartSchema]).nullable(),
    quantity: z.string(),
    unitCost: z.string(),
    notes: z.string(),
  })
  .refine((form) => form.part !== null, {
    message: 'Select or create a part',
    path: ['part'],
  })
  .refine((form) => form.kind === 'PURCHASE' || (form.part !== null && 'id' in form.part), {
    message: 'A sale requires an existing part',
    path: ['part'],
  })
  .refine((form) => /^\d+$/.test(form.quantity) && Number(form.quantity) > 0, {
    message: 'Enter a quantity',
    path: ['quantity'],
  })

export type StoreTransactionForm = z.infer<typeof StoreTransactionFormSchema>

export const EMPTY_STORE_TRANSACTION_FORM: StoreTransactionForm = {
  kind: 'PURCHASE',
  part: null,
  quantity: '',
  unitCost: '',
  notes: '',
}

// Money is stored as Decimal(12,2), so anything finer than a cent cannot be represented.
const UNIT_PRICE_PATTERN = /^\d+(\.\d{1,2})?$/

// Restate what stock on hand is worth. Only the new unit price is collected — the
// quantity revalued is whatever the ledger says is on hand when the backend records it.
export const RevalueStorePartFormSchema = z
  .object({
    unitPrice: z.string(),
    notes: z.string(),
  })
  .refine((form) => UNIT_PRICE_PATTERN.test(form.unitPrice.trim()), {
    message: 'Enter a unit price of 0 or more, to at most two decimals',
    path: ['unitPrice'],
  })
export type RevalueStorePartForm = z.infer<typeof RevalueStorePartFormSchema>

export const EMPTY_REVALUE_STORE_PART_FORM: RevalueStorePartForm = {
  unitPrice: '',
  notes: '',
}

// Consume a part from store inventory onto an asset. part is a per-warehouse
// summary row so its on_hand (stock guard) is available without a second lookup.
// The cost is derived from the FIFO ledger on the backend, so no cost is collected here.
// last_updated (z.coerce.date) is dropped: it isn't needed in the form and its
// `unknown` zod input type otherwise breaks the react-hook-form resolver typing.
export const AddStorePartFormSchema = z
  .object({
    warehouse: WarehouseSchema.nullable(),
    part: StorePartSummarySchema.omit({ last_updated: true, stock_value: true }).nullable(),
    quantity: z.string(),
  })
  .refine((form) => form.warehouse !== null, {
    message: 'Select a warehouse',
    path: ['warehouse'],
  })
  .refine((form) => form.part !== null, {
    message: 'Select a part',
    path: ['part'],
  })
  .refine((form) => /^\d+$/.test(form.quantity) && Number(form.quantity) > 0, {
    message: 'Enter a quantity',
    path: ['quantity'],
  })
  .refine(
    (form) =>
      form.part === null ||
      !/^\d+$/.test(form.quantity) ||
      Number(form.quantity) <= form.part.on_hand,
    { message: 'Quantity exceeds stock on hand', path: ['quantity'] },
  )

export type AddStorePartForm = z.infer<typeof AddStorePartFormSchema>

export const EMPTY_ADD_STORE_PART_FORM: AddStorePartForm = {
  warehouse: null,
  part: null,
  quantity: '1',
}
