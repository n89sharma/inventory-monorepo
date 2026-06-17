import { CreateStorePartSchema, StorePartSchema } from 'shared-types'
import { z } from 'zod'

// part: an existing StorePart (has id), a new CreateStorePart (no id), or nothing yet
export const AddPurchaseFormSchema = z
  .object({
    part: z.union([StorePartSchema, CreateStorePartSchema]).nullable(),
    quantity: z.string(),
    unitCost: z.string(),
    notes: z.string()
  })
  .refine(form => form.part !== null, {
    message: 'Select or create a part',
    path: ['part']
  })
  .refine(form => /^\d+$/.test(form.quantity) && Number(form.quantity) > 0, {
    message: 'Enter a quantity',
    path: ['quantity']
  })

export type AddPurchaseForm = z.infer<typeof AddPurchaseFormSchema>

export const EMPTY_ADD_PURCHASE_FORM: AddPurchaseForm = {
  part: null,
  quantity: '',
  unitCost: '',
  notes: ''
}
