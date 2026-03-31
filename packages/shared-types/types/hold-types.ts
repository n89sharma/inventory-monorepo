import { z } from 'zod';
import { AssetSummarySchema } from './asset-types.js';
import { OrgDetailSchema } from './organization-types.js';
import { UserSchema } from './user-types.js';

export const HoldSchema = z.object({
  hold_number: z.string(),
  created_by: z.string(),
  created_for: z.string(),
  customer: z.string(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  from_dt: z.coerce.date().nullable(),
  to_dt: z.coerce.date().nullable()
});

export type Hold = z.infer<typeof HoldSchema>;

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
