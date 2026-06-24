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

// Per-asset outcome chosen when departing; persisted as the asset's new status.
export const OutgoingStatusSchema = z.enum(['SOLD', 'HARVESTED', 'SCRAPPED'])
export type OutgoingStatus = z.infer<typeof OutgoingStatusSchema>

export const DEFAULT_OUTGOING_STATUS: OutgoingStatus = 'SOLD'

export const OUTGOING_STATUS_LABELS = {
  SOLD: 'Sold',
  HARVESTED: 'Harvested',
  SCRAPPED: 'Scrapped'
} as const satisfies Record<OutgoingStatus, string>

export const DepartureAssetInputSchema = z.object({
  id: z.number(),
  outgoing_status: OutgoingStatusSchema
})
export type DepartureAssetInput = z.infer<typeof DepartureAssetInputSchema>

// PATCH /departures/:departureNumber/assets/outgoing-status
export const SetDepartureOutgoingStatusSchema = z.object({
  assetIds: z.array(z.number().int()).nonempty(),
  outgoing_status: OutgoingStatusSchema
})
export type SetDepartureOutgoingStatus = z.infer<typeof SetDepartureOutgoingStatusSchema>

// POST /departures
export const CreateDepartureSchema = z.object({
  origin: WarehouseSchema,
  customer: OrgSummarySchema,
  transporter: OrgSummarySchema,
  comment: z.string().nullable(),
  assets: z.array(DepartureAssetInputSchema).nonempty("No assets in the departure").max(2000)
})
export type CreateDeparture = z.infer<typeof CreateDepartureSchema>

// PATCH /departures/:departureNumber/metadata
export const UpdateDepartureMetadataSchema = z.object({
  origin: WarehouseSchema,
  customer: OrgSummarySchema,
  transporter: OrgSummarySchema,
  comment: z.string().nullable()
})
export type UpdateDepartureMetadata = z.infer<typeof UpdateDepartureMetadataSchema>
