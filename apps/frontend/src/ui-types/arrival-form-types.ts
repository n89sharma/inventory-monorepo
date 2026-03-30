import { CoreFunctionsSchema, ModelSchema, OrgSummarySchema, type CoreFunction, type Model, type OrgSummary, type Status, type Warehouse } from "shared-types"
import z from "zod"
import { isSelected, StatusSelectOptionSchema, WarehouseSelectOptionSchema, type SelectOption } from "./select-option-types"

// Asset Modal within Edit or Create Asset
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

// Arrival Form Page within Edit or Create Arrival
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