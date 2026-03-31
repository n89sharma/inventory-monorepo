import { z } from 'zod';
import { AssetSummarySchema } from './asset-types.js';
import { OrgDetailSchema } from './organization-types.js';
import { WarehouseSchema } from './reference-data-types.js';

export const DepartureSchema = z.object({
  departure_number: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination: z.string(),
  transporter: z.string(),
  created_at: z.coerce.date(),
  created_by: z.string()
});

export type Departure = z.infer<typeof DepartureSchema>;

// GET /departures/:departureNumber
export const DepartureDetailSchema = z.object({
  departure_number: z.string(),
  origin: WarehouseSchema,
  customer: OrgDetailSchema,
  transporter: OrgDetailSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.string().optional(),
  assets: z.array(AssetSummarySchema)
})
export type DepartureDetail = z.infer<typeof DepartureDetailSchema>
