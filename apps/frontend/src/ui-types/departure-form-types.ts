import type { AssetSummary, OrgSummary, Warehouse } from 'shared-types'
import { AssetSummarySchema, OrgSummarySchema } from 'shared-types'
import z from 'zod'
import { isSelected, WarehouseSelectOptionSchema, type SelectOption } from './select-option-types'

export const DepartureFormSchema = z.object({
  id: z.number().optional(),
  origin: WarehouseSelectOptionSchema.refine(val => isSelected(val), "Origin required"),
  customer: OrgSummarySchema.nullable().refine(val => !!val, "Customer required"),
  transporter: OrgSummarySchema.nullable().refine(val => !!val, "Transporter required"),
  comment: z.string(),
  assets: z.array(AssetSummarySchema).nonempty("No assets in the departure")
})

export type DepartureForm = {
  id?: number
  origin: SelectOption<Warehouse>
  customer: OrgSummary | null
  transporter: OrgSummary | null
  comment: string
  assets: AssetSummary[]
}
