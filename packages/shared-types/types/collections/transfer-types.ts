import { z } from 'zod'
import { AssetSearchRowSchema, AssetSummarySchema } from '../asset-types.js'
import { OrgDetailSchema, OrgSummarySchema } from '../organization-types.js'
import { WarehouseSchema } from '../reference-data-types.js'
import { TransferCostsSchema } from '../transfer-cost-types.js'
import { CollectionSummarySchema } from './collection-types.js'

const TRANSFER_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const todayYmd = (): string => new Date().toISOString().slice(0, 10)

export const TransferDateSchema = z
  .string()
  .regex(TRANSFER_DATE_PATTERN, 'Transfer date must be YYYY-MM-DD')
  .refine((value) => value >= todayYmd(), 'Transfer date cannot be in the past')

// Transfer lifecycle. DB stores the raw string (Transfer.status); this is the compile-time
// symbol for code that names a state. Wire fields stay z.string() like AssetSummary.status.
export const TransferStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'LOADING_IN_PROGRESS',
  'IN_TRANSIT',
  'UNLOADING_IN_PROGRESS',
  'COMPLETE',
])
export type TransferStatus = z.infer<typeof TransferStatusSchema>
export const TRANSFER_STATUS = TransferStatusSchema.enum

// Per-asset loading/unloading checklist state on a transfer. Whether a Missing asset was lost
// at load or unload is never stored here — it's read off `loaded` plus the asset's own status.
export const TransferAssetScanStateSchema = z.object({
  loaded: z.boolean(),
  unloaded: z.boolean(),
})
export type TransferAssetScanState = z.infer<typeof TransferAssetScanStateSchema>

export const TransferAssetRowSchema = AssetSearchRowSchema.extend({
  scan: TransferAssetScanStateSchema,
})
export type TransferAssetRow = z.infer<typeof TransferAssetRowSchema>

// Request body shared by the four per-asset lifecycle actions: scan-loaded, scan-unloaded,
// mark-missing-at-load, mark-missing-at-unload.
export const TransferAssetIdSchema = z.object({
  assetId: z.number().int(),
})
export type TransferAssetId = z.infer<typeof TransferAssetIdSchema>

// GET /transfers?fromDate...&toDate...&origin...&destination...
export const TransferSummarySchema = CollectionSummarySchema.extend({
  transfer_number: z.string(),
  status: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  transporter: z.string(),
  transfer_date: z.string().nullable(),
})
export type TransferSummary = z.infer<typeof TransferSummarySchema>

// GET /transfers/:transferNumber
export const TransferDetailSchema = z.object({
  transfer_number: z.string(),
  status: z.string(),
  origin: WarehouseSchema,
  destination: WarehouseSchema,
  transporter: OrgDetailSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.string().optional(),
  transfer_date: z.string().nullable(),
  assets: z.array(TransferAssetRowSchema),
})
export type TransferDetail = z.infer<typeof TransferDetailSchema>

// POST /transfers
export const CreateTransferSchema = z
  .object({
    origin: WarehouseSchema.refine((val) => !!val, 'Origin required'),
    destination: WarehouseSchema.refine((val) => !!val, 'Destination required'),
    transporter: OrgSummarySchema.refine((val) => !!val, 'Transporter required'),
    comment: z.string().nullable(),
    assets: z.array(AssetSummarySchema).nonempty('No assets in the transfer').max(2000),
  })
  .refine((data) => data.origin.id !== data.destination.id, {
    message: 'Origin and destination cannot be the same',
    path: ['destination'],
  })
export type CreateTransfer = z.infer<typeof CreateTransferSchema>

// PATCH /transfers/:transferNumber/metadata
export const UpdateTransferMetadataSchema = z
  .object({
    origin: WarehouseSchema,
    destination: WarehouseSchema,
    transporter: OrgSummarySchema,
    comment: z.string().nullable(),
  })
  .refine((data) => data.origin.id !== data.destination.id, {
    message: 'Origin and destination cannot be the same',
    path: ['destination'],
  })
export type UpdateTransferMetadata = z.infer<typeof UpdateTransferMetadataSchema>

// POST /transfers/:transferNumber/schedule
export const ScheduleTransferSchema = z.object({
  transfer_date: TransferDateSchema,
})
export type ScheduleTransfer = z.infer<typeof ScheduleTransferSchema>

// PATCH /transfers/:transferNumber/transfer-date
export const UpdateTransferDateSchema = z.object({
  transfer_date: TransferDateSchema,
})
export type UpdateTransferDate = z.infer<typeof UpdateTransferDateSchema>

// POST /transfers/:transferNumber/depart — null costs means the origin warehouse defaults.
export const DepartTransferSchema = z.object({
  costs: TransferCostsSchema.nullable(),
})
export type DepartTransfer = z.infer<typeof DepartTransferSchema>

// POST /transfers/:transferNumber/assets/return-to-origin
export const ReturnAssetsToOriginSchema = z.object({
  assetIds: z.array(z.number().int()).nonempty().max(2000),
})
export type ReturnAssetsToOrigin = z.infer<typeof ReturnAssetsToOriginSchema>

// PATCH /transfers/:transferNumber/notes
export const UpdateTransferNotesSchema = z.object({
  comment: z.string().nullable(),
})
export type UpdateTransferNotes = z.infer<typeof UpdateTransferNotesSchema>
