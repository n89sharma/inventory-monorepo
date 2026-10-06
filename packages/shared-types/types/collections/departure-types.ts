import { z } from 'zod'
import { AssetSearchRowSchema } from '../asset-types.js'
import { ScheduledDateSchema } from '../scheduled-date-types.js'
import { OrgDetailSchema, OrgSummarySchema } from '../organization-types.js'
import { OutgoingStatusSchema, WarehouseSchema } from '../reference-data-types.js'
import { UserSchema } from '../user-types.js'
import { CollectionSummarySchema } from './collection-types.js'

// Departure lifecycle. DB stores the raw string (Departure.status); this is the compile-time
// symbol for code that names a state. Wire fields stay z.string() like TransferSummary.status.
export const DepartureStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'LOADING_IN_PROGRESS',
  'LOADED',
  'COMPLETE',
])
export type DepartureStatus = z.infer<typeof DepartureStatusSchema>
export const DEPARTURE_STATUS = DepartureStatusSchema.enum

export const DepartureSummarySchema = CollectionSummarySchema.extend({
  departure_number: z.string(),
  status: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination: z.string(),
  transporter: z.string(),
  salesperson: z.string().nullable(),
  departure_date: z.string().nullable(),
})
export type DepartureSummary = z.infer<typeof DepartureSummarySchema>

export const DepartureInvoiceSchema = z.object({
  invoice_number: z.string(),
  invoice_reference: z.string(),
  customer_id: z.number().int(),
  customer: z.string(),
})
export type DepartureInvoice = z.infer<typeof DepartureInvoiceSchema>

// Per-asset loading checklist state on a departure. A Missing asset was lost at load:
// it is Missing with loaded still false.
export const DepartureAssetScanStateSchema = z.object({ loaded: z.boolean() })
export type DepartureAssetScanState = z.infer<typeof DepartureAssetScanStateSchema>

export const DepartureAssetRowSchema = AssetSearchRowSchema.extend({
  scan: DepartureAssetScanStateSchema,
  outgoing_status: OutgoingStatusSchema,
})
export type DepartureAssetRow = z.infer<typeof DepartureAssetRowSchema>

// GET /departures/:departureNumber
export const DepartureDetailSchema = z.object({
  departure_number: z.string(),
  status: z.string(),
  origin: WarehouseSchema,
  customer: OrgDetailSchema,
  transporter: OrgDetailSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.string().optional(),
  departure_date: z.string().nullable(),
  salesperson: UserSchema.nullable(),
  assets: z.array(DepartureAssetRowSchema),
  invoices: z.array(DepartureInvoiceSchema),
})
export type DepartureDetail = z.infer<typeof DepartureDetailSchema>

export const DepartureAssetInputSchema = z.object({
  id: z.number(),
  outgoing_status: OutgoingStatusSchema,
})
export type DepartureAssetInput = z.infer<typeof DepartureAssetInputSchema>

// PATCH /departures/:departureNumber/assets/outgoing-status
export const SetDepartureOutgoingStatusSchema = z.object({
  assetIds: z.array(z.number().int()).nonempty(),
  outgoing_status: OutgoingStatusSchema,
})
export type SetDepartureOutgoingStatus = z.infer<typeof SetDepartureOutgoingStatusSchema>

// POST /departures/:departureNumber/assets/return-to-stock
export const ReturnAssetsToStockSchema = z.object({
  assetIds: z.array(z.number().int()).nonempty().max(2000),
})
export type ReturnAssetsToStock = z.infer<typeof ReturnAssetsToStockSchema>

// POST /departures
export const CreateDepartureSchema = z.object({
  origin: WarehouseSchema,
  customer: OrgSummarySchema,
  transporter: OrgSummarySchema,
  salesperson_id: z.number().int(),
  comment: z.string().nullable(),
  assets: z.array(DepartureAssetInputSchema).max(2000),
})
export type CreateDeparture = z.infer<typeof CreateDepartureSchema>

// PATCH /departures/:departureNumber/metadata
export const UpdateDepartureMetadataSchema = z.object({
  origin: WarehouseSchema,
  customer: OrgSummarySchema,
  transporter: OrgSummarySchema,
  salesperson: UserSchema,
  comment: z.string().nullable(),
})
export type UpdateDepartureMetadata = z.infer<typeof UpdateDepartureMetadataSchema>

// POST /departures/:departureNumber/schedule
export const ScheduleDepartureSchema = z.object({
  departure_date: ScheduledDateSchema,
})
export type ScheduleDeparture = z.infer<typeof ScheduleDepartureSchema>

// POST /departures/:departureNumber/assets/{scan-loaded,mark-missing-at-load,undo-load}
export const DepartureAssetIdSchema = z.object({ assetId: z.number().int() })
export type DepartureAssetId = z.infer<typeof DepartureAssetIdSchema>

// PATCH /departures/:departureNumber/notes
export const UpdateDepartureNotesSchema = z.object({ comment: z.string() })
export type UpdateDepartureNotes = z.infer<typeof UpdateDepartureNotesSchema>

// PATCH /departures/:departureNumber/departure-date
export const UpdateDepartureDateSchema = z.object({
  departure_date: ScheduledDateSchema,
})
export type UpdateDepartureDate = z.infer<typeof UpdateDepartureDateSchema>
