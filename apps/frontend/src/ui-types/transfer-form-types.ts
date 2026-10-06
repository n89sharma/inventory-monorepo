import type { OrgSummary, Warehouse } from 'shared-types'
import { OrgSummarySchema } from 'shared-types'
import z from 'zod'
import { isSelected, WarehouseSelectOptionSchema, type SelectOption } from './select-option-types'

export const TransferMetadataFormSchema = z
  .object({
    origin: WarehouseSelectOptionSchema.refine((val) => isSelected(val), 'Origin required'),
    destination: WarehouseSelectOptionSchema.refine(
      (val) => isSelected(val),
      'Destination required',
    ),
    transporter: OrgSummarySchema.nullable().refine((val) => !!val, 'Transporter required'),
    comment: z.string(),
    // No past-date refine here: this field stays visible (but disabled) outside Scheduled, and a
    // transfer's date can legitimately be in the past by then — see edit-transfer-metadata-modal.
    transfer_date: z.date().nullable(),
  })
  .refine(
    (data) => {
      if (isSelected(data.origin) && isSelected(data.destination)) {
        return data.origin.selected.id !== data.destination.selected.id
      }
      return true
    },
    { message: 'Origin and destination cannot be the same', path: ['destination'] },
  )

export type TransferMetadataForm = {
  origin: SelectOption<Warehouse>
  destination: SelectOption<Warehouse>
  transporter: OrgSummary | null
  comment: string
  transfer_date: Date | null
}
