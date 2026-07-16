import { OrgSummarySchema } from 'shared-types'
import type { AssetSummary, InvoiceType, OrgSummary } from 'shared-types'
import z from 'zod'
import { AssetSummaryFormSchema } from './asset-summary-form-schema'
import { SelectOptionSchema, isSelected, type SelectOption } from './select-option-types'

const InvoiceTypeZod = z.object({ id: z.number(), type: z.string() })
const InvoiceTypeSelectOptionSchema = SelectOptionSchema(InvoiceTypeZod)

export const InvoiceFormSchema = z.object({
  invoice_reference: z.string().min(1, 'Invoice reference is required'),
  organization: OrgSummarySchema.nullable().refine((val) => !!val, 'Organization is required'),
  invoice_type: InvoiceTypeSelectOptionSchema.refine(
    (val) => isSelected(val),
    'Invoice type is required',
  ),
  is_cleared: z.boolean(),
  comment: z.string(),
  assets: z.array(AssetSummaryFormSchema).nonempty('No assets in the invoice'),
})

export type InvoiceForm = {
  invoice_reference: string
  organization: OrgSummary | null
  invoice_type: SelectOption<InvoiceType>
  is_cleared: boolean
  comment: string
  assets: AssetSummary[]
}

export const InvoiceMetadataFormSchema = z.object({
  organization: OrgSummarySchema.nullable().refine((val) => !!val, 'Organization is required'),
  is_cleared: z.boolean(),
  comment: z.string(),
})

export type InvoiceMetadataForm = {
  organization: OrgSummary | null
  is_cleared: boolean
  comment: string
}
