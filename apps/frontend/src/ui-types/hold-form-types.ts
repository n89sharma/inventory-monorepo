import { OrgSummarySchema, UserSchema } from 'shared-types'
import type { OrgSummary, User } from 'shared-types'
import z from 'zod'
import { SelectOptionSchema, isSelected, type SelectOption } from './select-option-types'

const UserSelectOptionSchema = SelectOptionSchema(UserSchema)

export const HoldMetadataFormSchema = z.object({
  created_for: UserSelectOptionSchema.refine((val) => isSelected(val), 'Created For is required'),
  customer: OrgSummarySchema.nullable().refine((val) => !!val, 'Customer is required'),
  notes: z.string(),
})

export type HoldMetadataForm = {
  created_for: SelectOption<User>
  customer: OrgSummary | null
  notes: string
}
