import type { AssetSummary, OrgSummary, Warehouse } from 'shared-types'
import { AssetSummarySchema, OrgSummarySchema } from 'shared-types'
import z from 'zod'
import { isSelected, WarehouseSelectOptionSchema, type SelectOption } from './select-option-types'

export const TransferFormSchema = z.object({
  id: z.number().optional(),
  origin: WarehouseSelectOptionSchema.refine(val => isSelected(val), "Origin required"),
  destination: WarehouseSelectOptionSchema.refine(val => isSelected(val), "Destination required"),
  transporter: OrgSummarySchema.nullable().refine(val => !!val, "Transporter required"),
  comment: z.string(),
  assets: z.array(AssetSummarySchema).nonempty("No assets in the transfer")
}).refine(data => {
  if (isSelected(data.origin) && isSelected(data.destination)) {
    return data.origin.selected.id !== data.destination.selected.id
  }
  return true
}, { message: "Origin and destination cannot be the same", path: ["destination"] })

export type TransferForm = {
  id?: number
  origin: SelectOption<Warehouse>
  destination: SelectOption<Warehouse>
  transporter: OrgSummary | null
  comment: string
  assets: AssetSummary[]
}
