import { z } from 'zod'
import { ModelSchema, StatusSchema, CoreFunctionsSchema, OrgSchema, WarehouseSchema, Model, Status, CoreFunction, Organization, Warehouse } from './otherTypes.js'

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

export const AssetSchema = z.object({
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

export const ArrivalSchema = z.object({
  id: z.number().optional(),
  vendor: OrgSchema.refine(val => !!val, "Vendor required"),
  transporter: OrgSchema.refine(val => !!val, "Transporter required"),
  warehouse: WarehouseSchema.refine(val => !!val, "Warehouse required"),
  comment: z.string(),
  assets: z.array(AssetSchema).nonempty("No assets in the arrival")
})

export type Asset = {
  id?: number
  model: Model
  serialNumber: string
  meterBlack: number
  meterColour: number
  cassettes: number
  technicalStatus: Status
  internalFinisher: string
  coreFunctions: CoreFunction[]
}

export type Arrival = {
  id?: number
  vendor: Organization
  transporter: Organization
  warehouse: Warehouse
  comment: string
  assets: Asset[]
}

