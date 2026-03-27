import { z } from 'zod';
import { AssetSummarySchema } from './asset-types';
import { ModelSchema, type Model } from './model-types';
import { OrgDetailSchema, OrgSummarySchema, type OrgSummary } from './organization-types';
import { CoreFunctionsSchema, StatusSchema, WarehouseSchema, type CoreFunction, type Status, type Warehouse } from './reference-data-types';
import { SelectOptionSchema, isSelected, type SelectOption } from './select-option-types';

export const ArrivalSummarySchema = z.object({
  arrival_number: z.string(),
  vendor: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  transporter: z.string(),
  created_at: z.iso.datetime(),
  created_by: z.string().nullable()
})

export type ArrivalSummary = z.infer<typeof ArrivalSummarySchema>

export const ArrivalDetailSchema = z.object({
  arrival_number: z.string(),
  vendor: OrgDetailSchema,
  transporter: OrgDetailSchema,
  warehouse: WarehouseSchema,
  comment: z.string().nullable(),
  created_at: z.iso.datetime(),
  created_by: z.string().nullable(),
  assets: z.array(AssetSummarySchema)
})

export type ArrivalDetail = z.infer<typeof ArrivalDetailSchema>

const StatusSelectOptionSchema = SelectOptionSchema(StatusSchema)
const WarehouseSelectOptionSchema = SelectOptionSchema(WarehouseSchema)

export const AssetFormSchema = z.object({
  id: z.number().optional(),
  model: ModelSchema.nullable().refine(val => !!val, "Model is required"),
  serialNumber: z.string().refine(val => val.length > 0, "Serial number is required"),
  meterBlack: z.number().min(0).nullable().refine(v => v != null && v != undefined, "Black meter is required"),
  meterColour: z.number().min(0).nullable().refine(v => v != null && v != undefined, "Colour meter is required"),
  cassettes: z.number().min(0).nullable().refine(v => v != null && v != undefined, "Cassettes is required"),
  technicalStatus: StatusSelectOptionSchema.refine(val => isSelected(val), "Technical status is required"),
  internalFinisher: z.string(),
  coreFunctions: z.array(CoreFunctionsSchema)
})

export const ArrivalFormSchema = z.object({
  id: z.number().optional(),
  vendor: OrgSummarySchema.nullable().refine(val => !!val, "Vendor required"),
  transporter: OrgSummarySchema.nullable().refine(val => !!val, "Transporter required"),
  warehouse: WarehouseSelectOptionSchema.refine(val => isSelected(val), "Warehouse required"),
  comment: z.string(),
  assets: z.array(AssetFormSchema).nonempty("No assets in the arrival")
})

export type AssetForm = {
  id?: number | undefined,
  model: Model | null,
  serialNumber: string,
  meterBlack: number | null,
  meterColour: number | null,
  cassettes: number | null,
  technicalStatus: SelectOption<Status>,
  internalFinisher: string,
  coreFunctions: CoreFunction[]
}

export type ArrivalForm = {
  id?: number | undefined,
  vendor: OrgSummary | null,
  transporter: OrgSummary | null,
  warehouse: SelectOption<Warehouse>,
  comment: string
  assets: AssetForm[]
}

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
export type EditAsset = z.infer<typeof EditAssetSchema>
