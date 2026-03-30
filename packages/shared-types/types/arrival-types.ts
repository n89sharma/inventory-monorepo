import { z } from 'zod';
import { AssetSummarySchema } from './asset-types.js';
import { ModelSchema } from './model-types.js';
import { OrgDetailSchema, OrgSummarySchema } from './organization-types.js';
import { CoreFunctionsSchema, StatusSchema, WarehouseSchema } from './reference-data-types.js';

// GET /arrivals?fromDate...&toDate...&warehouse...
export const ArrivalSummarySchema = z.object({
  arrival_number: z.string(),
  vendor: z.string(),
  transporter: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  created_at: z.coerce.date(),
  created_by: z.string().nullable()
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
  created_by: z.string().optional(),
  assets: z.array(AssetSummarySchema)
})
export type ArrivalDetail = z.infer<typeof ArrivalDetailSchema>

// POST /arrivals
export const CreateAssetSchema = z.object({
  model: ModelSchema.refine(val => !!val, "Model is required"),
  serialNumber: z.string().refine(val => val.length > 0, "Serial number is required"),
  meterBlack: z.number().min(0, "Meter must be positive"),
  meterColour: z.number().min(0, "Meter must be positive"),
  cassettes: z.number().min(0, "Cassettes are required"),
  technicalStatus: StatusSchema.refine(val => !!val, "Technical status is required"),
  internalFinisher: z.string(),
  coreFunctions: z.array(CoreFunctionsSchema)
})
export type CreateAsset = z.infer<typeof CreateAssetSchema>

export const CreateArrivalSchema = z.object({
  vendor: OrgSummarySchema.refine(val => !!val, "Vendor required"),
  transporter: OrgSummarySchema.refine(val => !!val, "Transporter required"),
  warehouse: WarehouseSchema.refine(val => !!val, "Warehouse required"),
  comment: z.string(),
  assets: z.array(CreateAssetSchema).nonempty("No assets in the arrival")
})
export type CreateArrival = z.infer<typeof CreateArrivalSchema>

// PUT /arrivals
export const UpdateAssetSchema = CreateAssetSchema.extend({
  id: z.number().optional()
})
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>

export const UpdateArrivalSchema = CreateArrivalSchema.extend({
  id: z.number(),
  assets: z.array(UpdateAssetSchema).nonempty("No assets in the arrival")
})
export type UpdateArrival = z.infer<typeof UpdateArrivalSchema>

// GET /arrivals/1100034/edit
export const AssetFormDataSchema = z.object({
  id: z.number(),
  barcode: z.string(),
  modelId: z.number(),
  serialNumber: z.string(),
  meterBlack: z.number(),
  meterColour: z.number(),
  cassettes: z.number().nullable(),
  technicalStatusId: z.number(),
  internalFinisher: z.string(),
  coreFunctionIds: z.array(z.number())
})
export type AssetFormData = z.infer<typeof AssetFormDataSchema>

// GET /arrivals/1100034/edit
export const ArrivalFormDataSchema = z.object({
  id: z.number(),
  arrivalNumber: z.string(),
  vendorId: z.number(),
  transporterId: z.number(),
  warehouseId: z.number().nullable(),
  comment: z.string(),
  assets: z.array(AssetFormDataSchema)
})
export type ArrivalFormData = z.infer<typeof ArrivalFormDataSchema>
