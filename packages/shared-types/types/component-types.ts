import { z } from 'zod'

export const ComponentSummarySchema = z.object({
  id: z.number(),
  brand_id: z.number(),
  brand_name: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  asset_count: z.number(),
})

export type ComponentSummary = z.infer<typeof ComponentSummarySchema>

export const CreateComponentSchema = z.object({
  name: z.string().min(1),
  brand_id: z.number(),
  is_active: z.boolean().default(true),
})

export type CreateComponent = z.infer<typeof CreateComponentSchema>

// PATCH /components/:componentId
export const UpdateComponentSchema = z.object({
  name: z.string().min(1),
  brand_id: z.number(),
  is_active: z.boolean(),
})

export type UpdateComponent = z.infer<typeof UpdateComponentSchema>

// POST /components/merge/preview
export const ComponentMergeCandidateSchema = z.object({
  id: z.number(),
  brand_name: z.string(),
  name: z.string(),
  reference_count: z.number(),
})

export const ComponentMergePreviewSchema = z.object({
  winner_id: z.number(),
  candidates: z.array(ComponentMergeCandidateSchema),
})

// POST /components/merge
export const MergeComponentFieldsSchema = CreateComponentSchema.pick({
  name: true,
  is_active: true,
})

export const MergeComponentSchema = z.object({
  ids: z.array(z.number()).min(2),
  component: MergeComponentFieldsSchema,
})

export type ComponentMergeCandidate = z.infer<typeof ComponentMergeCandidateSchema>
export type ComponentMergePreview = z.infer<typeof ComponentMergePreviewSchema>
export type MergeComponentFields = z.infer<typeof MergeComponentFieldsSchema>
export type MergeComponent = z.infer<typeof MergeComponentSchema>
