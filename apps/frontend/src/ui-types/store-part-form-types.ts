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

// Consume a part from store inventory onto an asset. part is a per-warehouse
// summary row so its on_hand (stock guard) and last_purchase_unit_cost (default)
// are available without a second lookup.
// last_updated (z.coerce.date) is dropped: it isn't needed in the form and its
// `unknown` zod input type otherwise breaks the react-hook-form resolver typing.
export const AddStorePartFormSchema = z
  .object({
    warehouse: WarehouseSchema.nullable(),
    part: StorePartSummarySchema.omit({ last_updated: true }).nullable(),
    quantity: z.string(),
    unitCost: z.string(),
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
  .refine((form) => form.unitCost.trim() !== '' && Number(form.unitCost) > 0, {
    message: 'Enter a unit cost greater than 0',
    path: ['unitCost'],
  })

export type AddStorePartForm = z.infer<typeof AddStorePartFormSchema>

export const EMPTY_ADD_STORE_PART_FORM: AddStorePartForm = {
  warehouse: null,
  part: null,
  quantity: '1',
  unitCost: '',
}
