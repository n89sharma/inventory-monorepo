import { z } from 'zod';
import { AssetSummarySchema } from '../asset-types.js';
import { OrgDetailSchema, OrgSummarySchema } from '../organization-types.js';
import { UserSchema } from '../user-types.js';
import { CollectionSummarySchema } from './collection-types.js';

export const HoldSummarySchema = CollectionSummarySchema.extend({
  hold_number: z.string(),
  created_for: z.string(),
  customer: z.string(),
  notes: z.string().nullable(),
  from_dt: z.coerce.date().nullable(),
  to_dt: z.coerce.date().nullable()
})
export type HoldSummary = z.infer<typeof HoldSummarySchema>;

// GET /holds/:holdNumber
export const HoldDetailSchema = z.object({
  hold_number: z.string(),
  created_by: UserSchema,
  created_for: UserSchema,
  customer: OrgDetailSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  from_dt: z.coerce.date().nullable(),
  to_dt: z.coerce.date().nullable(),
  assets: z.array(AssetSummarySchema)
})
export type HoldDetail = z.infer<typeof HoldDetailSchema>

// POST /holds
export const CreateHoldSchema = z.object({
  created_for_id: z.number().int(),
  customer_id: z.number().int(),
  notes: z.string().nullable(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the hold')
})
export type CreateHold = z.infer<typeof CreateHoldSchema>

// GET /holds/:holdNumber/edit + PUT /holds/:holdNumber
export const UpdateHoldSchema = z.object({
  id: z.number().int(),
  created_for: UserSchema,
  customer: OrgSummarySchema,
  notes: z.string().nullable(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the hold')
})
export type UpdateHold = z.infer<typeof UpdateHoldSchema>