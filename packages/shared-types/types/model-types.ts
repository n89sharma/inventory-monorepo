import { z } from 'zod';


export const ModelSchema = z.object({
  id: z.number(),
  brand_name: z.string(),
  model_name: z.string(),
  asset_type: z.string(),
  weight: z.number(),
  size: z.number()
});

export type Model = z.infer<typeof ModelSchema>;
