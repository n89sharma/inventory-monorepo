import { startOfDay } from 'date-fns'
import { INVOICE_TYPE, OrgSummarySchema } from 'shared-types'
import type { AssetSummary, InvoiceType, OrgSummary } from 'shared-types'
import z from 'zod'
import { AssetSummaryFormSchema } from './asset-summary-form-schema'
import { SelectOptionSchema, isSelected, type SelectOption } from './select-option-types'

export type InvoiceTypeFilter = typeof INVOICE_TYPE.purchase | typeof INVOICE_TYPE.sales

const InvoiceTypeZod = z.object({ id: z.number(), type: z.string() })
const InvoiceTypeSelectOptionSchema = SelectOptionSchema(InvoiceTypeZod)

const InvoiceDateFieldSchema = z
  .date({ message: 'Invoice date is required' })
  .refine((date) => date <= startOfDay(new Date()), 'Invoice date cannot be in the future')

export const InvoiceFormSchema = z.object({
  invoice_reference: z.string().min(1, 'Invoice reference is required'),
  invoice_date: InvoiceDateFieldSchema,
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
  invoice_date: Date
  organization: OrgSummary | null
  invoice_type: SelectOption<InvoiceType>
  is_cleared: boolean
  comment: string
  assets: AssetSummary[]
}

export const InvoiceMetadataFormSchema = z.object({
  invoice_reference: z.string().min(1, 'Invoice reference is required'),
  invoice_date: InvoiceDateFieldSchema,
  organization: OrgSummarySchema.nullable().refine((val) => !!val, 'Organization is required'),
  is_cleared: z.boolean(),
  comment: z.string(),
})

export type InvoiceMetadataForm = {
  invoice_reference: string
  invoice_date: Date
  organization: OrgSummary | null
  is_cleared: boolean
  comment: string
}
