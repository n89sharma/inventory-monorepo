import { z } from 'zod';

export const TransferSchema = z.object({
  transfer_number: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  transporter: z.string(),
  created_at: z.iso.datetime(),
  created_by: z.string()
});

export type Transfer = z.infer<typeof TransferSchema>;
