import { AssetSummarySchema, OrgSummarySchema } from 'shared-types'
import type { AssetSummary, InvoiceType, OrgSummary } from 'shared-types'
import z from 'zod'
import { SelectOptionSchema, isSelected, type SelectOption } from './select-option-types'

const InvoiceTypeZod = z.object({ id: z.number(), type: z.string() })
const InvoiceTypeSelectOptionSchema = SelectOptionSchema(InvoiceTypeZod)

export const InvoiceFormSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  organization: OrgSummarySchema.nullable().refine(val => !!val, 'Organization is required'),
  invoice_type: InvoiceTypeSelectOptionSchema.refine(val => isSelected(val), 'Invoice type is required'),
  is_cleared: z.boolean(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the invoice')
})

export type InvoiceForm = {
  invoice_number: string
  organization: OrgSummary | null
  invoice_type: SelectOption<InvoiceType>
  is_cleared: boolean
  assets: AssetSummary[]
}

export const InvoiceEditFormSchema = z.object({
  id: z.number(),
  invoice_number: z.string(),
  organization: OrgSummarySchema,
  invoice_type: z.object({ id: z.number(), type: z.string() }),
  is_cleared: z.boolean(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the invoice')
})

export type InvoiceEditForm = z.infer<typeof InvoiceEditFormSchema>
