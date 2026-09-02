import { z } from 'zod'

export const ModelSummarySchema = z.object({
  id: z.number(),
  brand_id: z.number(),
  brand_name: z.string(),
  model_name: z.string(),
  asset_type_id: z.number(),
  asset_type: z.string(),
  weight: z.number(),
  size: z.number(),
  is_colour: z.boolean(),
})

export type ModelSummary = z.infer<typeof ModelSummarySchema>

export const CreateModelSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0),
  size: z.number().min(0),
  brand_id: z.number(),
  asset_type_id: z.number(),
  is_colour: z.boolean().default(false),
})

export type CreateModel = z.infer<typeof CreateModelSchema>

// PATCH /models/:modelId
export const UpdateModelSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0),
  size: z.number().min(0),
  brand_id: z.number(),
  asset_type_id: z.number(),
  is_colour: z.boolean().default(false),
})

export type UpdateModel = z.infer<typeof UpdateModelSchema>

// GET /models/merge-preview?ids=
export const ModelMergeCandidateSchema = z.object({
  id: z.number(),
  brand_name: z.string(),
  model_name: z.string(),
  reference_count: z.number(),
})

export const ModelMergePreviewSchema = z.object({
  winner_id: z.number(),
  candidates: z.array(ModelMergeCandidateSchema),
})

// POST /models/merge
export const MergeModelSchema = z.object({
  ids: z.array(z.number()).min(2),
  model: UpdateModelSchema,
})

export type ModelMergeCandidate = z.infer<typeof ModelMergeCandidateSchema>
export type ModelMergePreview = z.infer<typeof ModelMergePreviewSchema>
export type MergeModel = z.infer<typeof MergeModelSchema>
