import { z } from 'zod'

export const CollectionSummarySchema = z.object({
  id: z.number().int(),
  created_at: z.coerce.date(),
  created_by: z.string(),
  asset_count: z.coerce.number().int().nullable(),
  copier_count: z.coerce.number().int().nullable(),
  finisher_count: z.coerce.number().int().nullable(),
  accessory_count: z.coerce.number().int().nullable(),
  other_count: z.coerce.number().int().nullable(),
})
export type CollectionSummarySchema = z.infer<typeof CollectionSummarySchema>

// PATCH /<collection>/:number/assets — delta-style add/remove
export const AssetDeltaSchema = z.object({
  assetIdsToAdd: z.array(z.number().int()).default([]),
  assetIdsToRemove: z.array(z.number().int()).default([]),
})
export type AssetDelta = z.infer<typeof AssetDeltaSchema>
