import { z } from 'zod';
import { AssetSummarySchema } from './asset-types.js';
import { ModelSchema } from './model-types.js';
import { OrgDetailSchema } from './organization-types.js';
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

// POST PUT /arrivals
export const CreateAssetSchema = z.object({
  id: z.number().optional(),
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

// POST PUT /arrivals
export const CreateArrivalSchema = z.object({
  id: z.number().optional(),
  vendor: OrgDetailSchema.refine(val => !!val, "Vendor required"),
  transporter: OrgDetailSchema.refine(val => !!val, "Transporter required"),
  warehouse: WarehouseSchema.refine(val => !!val, "Warehouse required"),
  comment: z.string(),
  assets: z.array(CreateAssetSchema).nonempty("No assets in the arrival")
})
export type CreateArrival = z.infer<typeof CreateArrivalSchema>

// GET /arrivals/1100034/edit
export const EditAssetSchema = z.object({
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
export type EditAsset = z.infer<typeof EditAssetSchema>

// GET /arrivals/1100034/edit
export const EditArrivalSchema = z.object({
  id: z.number(),
  arrivalNumber: z.string(),
  vendorId: z.number(),
  transporterId: z.number(),
  warehouseId: z.number(),
  comment: z.string(),
  assets: z.array(EditAssetSchema)
})
export type EditArrival = z.infer<typeof EditArrivalSchema>
