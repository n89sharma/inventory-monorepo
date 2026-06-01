import { z } from 'zod';
import { AssetSummarySchema, CreateAssetSchema } from '../asset-types.js';
import { OrgDetailSchema, OrgSummarySchema } from '../organization-types.js';
import { CountrySchema, WarehouseSchema } from '../reference-data-types.js';
import { CollectionSummarySchema } from './collection-types.js';

// GET /arrivals?fromDate...&toDate...&warehouse...
export const ArrivalSummarySchema = CollectionSummarySchema.extend({
  arrival_number: z.string(),
  vendor: z.string(),
  transporter: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  created_by: z.string()
})
export type ArrivalSummary = z.infer<typeof ArrivalSummarySchema>

// GET /arrivals/1100034
export const ArrivalDetailSchema = z.object({
  arrival_number: z.string(),
  vendor: OrgDetailSchema,
  transporter: OrgDetailSchema,
  warehouse: WarehouseSchema.nullable(),
  comment: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.string(),
  assets: z.array(AssetSummarySchema)
})
export type ArrivalDetail = z.infer<typeof ArrivalDetailSchema>

export const CreateArrivalSchema = z.object({
  vendor: OrgSummarySchema.refine(val => !!val, "Vendor required"),
  transporter: OrgSummarySchema.refine(val => !!val, "Transporter required"),
  warehouse: WarehouseSchema.refine(val => !!val, "Warehouse required"),
  comment: z.string().nullable(),
  assets: z.array(CreateAssetSchema).nonempty("No assets in the arrival").max(2000)
})
export type CreateArrival = z.infer<typeof CreateArrivalSchema>

// PATCH /arrivals/:arrivalNumber/assets/:assetId
//
// countryOfOrigin is nullable here (not in CreateAsset) because legacy asset
// rows pre-date that field being required. The non-null rule is enforced at
// the frontend form layer so the user must pick a country when editing.
export const UpdateAssetSchema = CreateAssetSchema.extend({
  id: z.number().optional(),
  countryOfOrigin: CountrySchema.nullable()
})
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>

// PATCH /arrivals/:arrivalNumber/metadata
export const UpdateArrivalMetadataSchema = z.object({
  vendor: OrgSummarySchema,
  transporter: OrgSummarySchema,
  warehouse: WarehouseSchema,
  comment: z.string().nullable()
})
export type UpdateArrivalMetadata = z.infer<typeof UpdateArrivalMetadataSchema>
