import { z } from 'zod';

export const DepartureSchema = z.object({
  departure_number: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination: z.string(),
  transporter: z.string(),
  created_at: z.iso.datetime(),
  created_by: z.string()
});

export type Departure = z.infer<typeof DepartureSchema>;
