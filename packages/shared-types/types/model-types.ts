import { z } from 'zod';


export const ModelSummarySchema = z.object({
  id: z.number(),
  brand_name: z.string(),
  model_name: z.string(),
  asset_type: z.string(),
  weight: z.number(),
  size: z.number()
});

export type ModelSummary = z.infer<typeof ModelSummarySchema>;

export const CreateModelSchema = z.object({
  name: z.string().min(1),
  weight: z.number().min(0),
  size: z.number().min(0),
  brand_id: z.number(),
  asset_type_id: z.number()
});

export type CreateModel = z.infer<typeof CreateModelSchema>;
