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
