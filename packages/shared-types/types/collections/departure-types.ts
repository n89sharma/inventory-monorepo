import { z } from 'zod';
import { AssetSummarySchema } from '../asset-types.js';
import { OrgDetailSchema, OrgSummarySchema } from '../organization-types.js';
import { WarehouseSchema } from '../reference-data-types.js';
import { CollectionSummarySchema } from './collection-types.js';

export const DepartureSummarySchema = CollectionSummarySchema.extend({
  departure_number: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination: z.string(),
  transporter: z.string()
})
export type DepartureSummary = z.infer<typeof DepartureSummarySchema>;

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

// POST /departures
export const CreateDepartureSchema = z.object({
  origin: WarehouseSchema,
  customer: OrgSummarySchema,
  transporter: OrgSummarySchema,
  comment: z.string().nullable(),
  assets: z.array(AssetSummarySchema).nonempty("No assets in the departure")
})
export type CreateDeparture = z.infer<typeof CreateDepartureSchema>

// GET /departures/:departureNumber/edit
// PUT /departures/:departureNumber
export const UpdateDepartureSchema = CreateDepartureSchema.extend({
  id: z.number()
})
export type UpdateDeparture = z.infer<typeof UpdateDepartureSchema>
