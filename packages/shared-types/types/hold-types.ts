import { z } from 'zod';

export const HoldSchema = z.object({
  hold_number: z.string(),
  created_by: z.string(),
  created_for: z.string(),
  customer: z.string(),
  notes: z.string(),
  created_at: z.iso.datetime(),
  from_dt: z.iso.datetime().nullable(),
  to_dt: z.iso.datetime().nullable()
});

export type Hold = z.infer<typeof HoldSchema>;
