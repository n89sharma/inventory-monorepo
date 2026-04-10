import { z } from 'zod';

export const CollectionSummarySchema = z.object({
  id: z.number().int(),
  created_at: z.coerce.date(),
  created_by: z.string(),
  asset_count: z.coerce.number().int().nullable()
})
export type CollectionSummarySchema = z.infer<typeof CollectionSummarySchema>