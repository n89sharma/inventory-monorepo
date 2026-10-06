import type { OrgSummary, User, Warehouse } from 'shared-types'
import { OrgSummarySchema, UserSchema } from 'shared-types'
import z from 'zod'
import {
  isSelected,
  SelectOptionSchema,
  WarehouseSelectOptionSchema,
  type SelectOption,
} from './select-option-types'

const UserSelectOptionSchema = SelectOptionSchema(UserSchema)

export const DepartureMetadataFormSchema = z.object({
  origin: WarehouseSelectOptionSchema.refine((val) => isSelected(val), 'Origin required'),
  customer: OrgSummarySchema.nullable().refine((val) => !!val, 'Customer required'),
  transporter: OrgSummarySchema.nullable().refine((val) => !!val, 'Transporter required'),
  salesperson: UserSelectOptionSchema.refine((val) => isSelected(val), 'Salesperson required'),
  comment: z.string(),
  departure_date: z.date().nullable(),
})

export type DepartureMetadataForm = {
  origin: SelectOption<Warehouse>
  customer: OrgSummary | null
  transporter: OrgSummary | null
  salesperson: SelectOption<User>
  comment: string
  departure_date: Date | null
}
