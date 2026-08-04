import type { AssetSummary, OrgSummary, OutgoingStatus, User, Warehouse } from 'shared-types'
import { OrgSummarySchema, OutgoingStatusSchema, UserSchema } from 'shared-types'
import z from 'zod'
import { AssetSummaryFormSchema } from './asset-summary-form-schema'
import {
  isSelected,
  SelectOptionSchema,
  WarehouseSelectOptionSchema,
  type SelectOption,
} from './select-option-types'

const DepartureFormAssetSchema = AssetSummaryFormSchema.extend({
  outgoing_status: OutgoingStatusSchema,
})

const UserSelectOptionSchema = SelectOptionSchema(UserSchema)

export type DepartureFormAsset = AssetSummary & { outgoing_status: OutgoingStatus }

export const DepartureFormSchema = z.object({
  id: z.number().optional(),
  origin: WarehouseSelectOptionSchema.refine((val) => isSelected(val), 'Origin required'),
  customer: OrgSummarySchema.nullable().refine((val) => !!val, 'Customer required'),
  transporter: OrgSummarySchema.nullable().refine((val) => !!val, 'Transporter required'),
  salesperson: UserSelectOptionSchema.refine((val) => isSelected(val), 'Salesperson required'),
  comment: z.string(),
  assets: z.array(DepartureFormAssetSchema).nonempty('No assets in the departure'),
})

export type DepartureForm = {
  id?: number
  origin: SelectOption<Warehouse>
  customer: OrgSummary | null
  transporter: OrgSummary | null
  salesperson: SelectOption<User>
  comment: string
  assets: DepartureFormAsset[]
}

export const DepartureMetadataFormSchema = z.object({
  origin: WarehouseSelectOptionSchema.refine((val) => isSelected(val), 'Origin required'),
  customer: OrgSummarySchema.nullable().refine((val) => !!val, 'Customer required'),
  transporter: OrgSummarySchema.nullable().refine((val) => !!val, 'Transporter required'),
  salesperson: UserSelectOptionSchema.refine((val) => isSelected(val), 'Salesperson required'),
  comment: z.string(),
})

export type DepartureMetadataForm = {
  origin: SelectOption<Warehouse>
  customer: OrgSummary | null
  transporter: OrgSummary | null
  salesperson: SelectOption<User>
  comment: string
}
