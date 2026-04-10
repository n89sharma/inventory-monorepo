import { AssetSummarySchema, OrgSummarySchema, UserSchema } from 'shared-types'
import type { AssetSummary, OrgSummary, User } from 'shared-types'
import z from 'zod'
import { SelectOptionSchema, isSelected, type SelectOption } from './select-option-types'

const UserSelectOptionSchema = SelectOptionSchema(UserSchema)

export const HoldFormSchema = z.object({
  id: z.number().optional(),
  created_for: UserSelectOptionSchema.refine(val => isSelected(val), 'Created For is required'),
  customer: OrgSummarySchema.nullable().refine(val => !!val, 'Customer is required'),
  notes: z.string(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the hold')
})

export type HoldForm = {
  id?: number
  created_for: SelectOption<User>
  customer: OrgSummary | null
  notes: string
  assets: AssetSummary[]
}
