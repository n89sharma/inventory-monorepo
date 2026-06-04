import type { CoreFunction, Country, ModelSummary, OrgSummary, Status, UpdateError, Warehouse } from "shared-types"
import { CoreFunctionsSchema, CountrySchema, MIN_MANUFACTURED_YEAR, ModelSummarySchema, OrgSummarySchema, UpdateErrorSchema } from "shared-types"
import z from "zod"
import { isSelected, StatusSelectOptionSchema, WarehouseSelectOptionSchema, type SelectOption } from "./select-option-types"

const HAS_ERRORS_READINESS = 'HAS_ERRORS'
const CURRENT_YEAR = new Date().getFullYear()

// Colour models require the C/M/Y channels for both drum life and toner; K is
// always required (enforced inline on the field). Mono models require K only.
const COLOUR_REQUIRED_CHANNELS = [
  { field: 'drumLifeC', label: 'Drum life C' },
  { field: 'drumLifeM', label: 'Drum life M' },
  { field: 'drumLifeY', label: 'Drum life Y' },
  { field: 'tonerLifeC', label: 'Toner life C' },
  { field: 'tonerLifeM', label: 'Toner life M' },
  { field: 'tonerLifeY', label: 'Toner life Y' },
] as const

// Technical-specification fields shared by the Create/Edit Asset modal and the
// Edit Technical Specifications modal. Defined once so the validation rules stay
// identical across all three modals — changing a rule here changes every modal.
const specFieldsShape = {
  readiness: StatusSelectOptionSchema.refine(val => isSelected(val), "Readiness required"),
  countryOfOrigin: CountrySchema.nullable().refine(val => !!val, "Country of origin is required"),
  manufacturedYear: z.number()
    .int()
    .min(MIN_MANUFACTURED_YEAR, `Year must be ${MIN_MANUFACTURED_YEAR} or later`)
    .max(CURRENT_YEAR, `Year cannot be in the future`)
    .nullable(),
  meterBlack: z.number().min(0).nullable().refine(v => v != null && v != undefined, "Black meter is required"),
  meterColour: z.number().min(0).nullable().refine(v => v != null && v != undefined, "Colour meter is required"),
  cassettes: z.number().min(0).nullable().refine(v => v != null && v != undefined, "Cassettes is required"),
  internalFinisher: z.string(),
  coreFunctions: z.array(CoreFunctionsSchema),
  drumLifeC: z.number().min(0).nullable(),
  drumLifeM: z.number().min(0).nullable(),
  drumLifeY: z.number().min(0).nullable(),
  drumLifeK: z.number().min(0).nullable().refine(v => v != null, "Drum life K required"),
  tonerLifeC: z.number().min(0).nullable(),
  tonerLifeM: z.number().min(0).nullable(),
  tonerLifeY: z.number().min(0).nullable(),
  tonerLifeK: z.number().min(0).nullable().refine(v => v != null, "Toner life K required"),
} as const

function refineColourChannels(
  val: Record<string, unknown>,
  isColour: boolean,
  ctx: z.RefinementCtx
) {
  if (!isColour) return
  for (const { field, label } of COLOUR_REQUIRED_CHANNELS) {
    if (val[field] == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${label} required` })
    }
  }
}

// Asset Modal within Edit or Create Asset
export const AssetFormSchema = z.object({
  id: z.number().optional(),
  model: ModelSummarySchema.nullable().refine(val => !!val, "Model is required"),
  serialNumber: z.string().refine(val => val.length > 0, "Serial number is required"),
  ...specFieldsShape,
  errors: z.array(UpdateErrorSchema),
  comment: z.string().max(2000).nullable()
}).superRefine((val, ctx) => {
  // Errors are required iff Readiness = Has Errors. The reverse direction is
  // prevented by the UI: the errors input is only enabled when Has Errors is
  // the current selection. Validating both ways here would surface a confusing
  // error against a disabled field.
  if (isSelected(val.readiness)
    && val.readiness.selected.status === HAS_ERRORS_READINESS
    && val.errors.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['errors'],
      message: 'Add at least one error'
    })
  }

  refineColourChannels(val, val.model?.is_colour ?? false, ctx)
})

// Edit Technical Specifications modal — the spec-field subset of an existing
// asset. `isColour` is carried (not user-editable) so the colour-channel rule
// matches the asset modal, which derives the same flag from the selected model.
export const SpecsFormSchema = z.object({
  ...specFieldsShape,
  isColour: z.boolean(),
}).superRefine((val, ctx) => {
  refineColourChannels(val, val.isColour, ctx)
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
  model: ModelSummary | null,
  serialNumber: string,
  meterBlack: number | null,
  meterColour: number | null,
  cassettes: number | null,
  readiness: SelectOption<Status>,
  countryOfOrigin: Country | null,
  manufacturedYear: number | null,
  internalFinisher: string,
  coreFunctions: CoreFunction[],
  drumLifeC: number | null,
  drumLifeM: number | null,
  drumLifeY: number | null,
  drumLifeK: number | null,
  tonerLifeC: number | null,
  tonerLifeM: number | null,
  tonerLifeY: number | null,
  tonerLifeK: number | null,
  errors: UpdateError[],
  comment: string | null
}

export type SpecsForm = {
  readiness: SelectOption<Status>,
  countryOfOrigin: Country | null,
  manufacturedYear: number | null,
  meterBlack: number | null,
  meterColour: number | null,
  cassettes: number | null,
  internalFinisher: string,
  coreFunctions: CoreFunction[],
  drumLifeC: number | null,
  drumLifeM: number | null,
  drumLifeY: number | null,
  drumLifeK: number | null,
  tonerLifeC: number | null,
  tonerLifeM: number | null,
  tonerLifeY: number | null,
  tonerLifeK: number | null,
  isColour: boolean,
}

export type ArrivalForm = {
  id?: number | undefined,
  vendor: OrgSummary | null,
  transporter: OrgSummary | null,
  warehouse: SelectOption<Warehouse>,
  comment: string
  assets: AssetForm[]
}

export const ArrivalMetadataFormSchema = z.object({
  vendor: OrgSummarySchema.nullable().refine(val => !!val, "Vendor required"),
  transporter: OrgSummarySchema.nullable().refine(val => !!val, "Transporter required"),
  warehouse: WarehouseSelectOptionSchema.refine(val => isSelected(val), "Warehouse required"),
  comment: z.string()
})

export type ArrivalMetadataForm = {
  vendor: OrgSummary | null
  transporter: OrgSummary | null
  warehouse: SelectOption<Warehouse>
  comment: string
}