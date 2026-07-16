import type {
  Component,
  CoreFunction,
  Country,
  ModelSummary,
  OrgSummary,
  Status,
  UpdateError,
  Warehouse,
} from 'shared-types'
import {
  ComponentSchema,
  CoreFunctionsSchema,
  CountrySchema,
  MIN_MANUFACTURED_YEAR,
  ModelSummarySchema,
  OrgSummarySchema,
  UpdateErrorSchema,
} from 'shared-types'
import z from 'zod'
import { specApplicability, type SpecApplicability } from '@/lib/asset-spec-applicability'
import {
  isSelected,
  StatusSelectOptionSchema,
  WarehouseSelectOptionSchema,
  type SelectOption,
} from './select-option-types'

const HAS_ERRORS_READINESS = 'HAS_ERRORS'
const CURRENT_YEAR = new Date().getFullYear()

// Technical-specification fields shared by the Create/Edit Asset modal and the
// Edit Technical Specifications modal. Defined once so the validation rules stay
// identical across all three modals — changing a rule here changes every modal.
const specFieldsShape = {
  readiness: StatusSelectOptionSchema.refine((val) => isSelected(val), 'Readiness required'),
  countryOfOrigin: CountrySchema.nullable(),
  manufacturedYear: z
    .number()
    .int()
    .min(MIN_MANUFACTURED_YEAR, `Year must be ${MIN_MANUFACTURED_YEAR} or later`)
    .max(CURRENT_YEAR, `Year cannot be in the future`)
    .nullable(),
  meterBlack: z.number().min(0).nullable(),
  meterColour: z.number().min(0).nullable(),
  cassettes: z.number().min(0).nullable(),
  component: ComponentSchema.nullable(),
  coreFunctions: z.array(CoreFunctionsSchema),
  drumLifeC: z.number().min(0).nullable(),
  drumLifeM: z.number().min(0).nullable(),
  drumLifeY: z.number().min(0).nullable(),
  drumLifeK: z.number().min(0).nullable(),
  tonerLifeC: z.number().min(0).nullable(),
  tonerLifeM: z.number().min(0).nullable(),
  tonerLifeY: z.number().min(0).nullable(),
  tonerLifeK: z.number().min(0).nullable(),
} as const

// Meter fields apply only to metered asset types; cassettes and the drum/toner
// consumables apply only to types that carry them (see specApplicability). Within
// an applicable group, the K channel is always required, and colour models also
// require the C/M/Y channels plus the colour meter. Non-applicable fields are
// hidden in the UI and left unvalidated (coerced to 0 at the create boundary).
const CONSUMABLE_COLOUR_REQUIRED_FIELDS = [
  { field: 'drumLifeC', label: 'Drum life C' },
  { field: 'drumLifeM', label: 'Drum life M' },
  { field: 'drumLifeY', label: 'Drum life Y' },
  { field: 'tonerLifeC', label: 'Toner life C' },
  { field: 'tonerLifeM', label: 'Toner life M' },
  { field: 'tonerLifeY', label: 'Toner life Y' },
] as const

function requireField(
  val: Record<string, unknown>,
  field: string,
  label: string,
  ctx: z.RefinementCtx,
) {
  if (val[field] == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${label} required` })
  }
}

function refineSpecFields(
  val: Record<string, unknown>,
  applicable: SpecApplicability,
  isColour: boolean,
  ctx: z.RefinementCtx,
) {
  if (applicable.meter) {
    requireField(val, 'meterBlack', 'Black meter', ctx)
    if (isColour) requireField(val, 'meterColour', 'Colour meter', ctx)
  }
  if (applicable.cassettes) {
    requireField(val, 'cassettes', 'Cassettes', ctx)
  }
  if (applicable.consumables) {
    requireField(val, 'drumLifeK', 'Drum life K', ctx)
    requireField(val, 'tonerLifeK', 'Toner life K', ctx)
    if (isColour) {
      for (const { field, label } of CONSUMABLE_COLOUR_REQUIRED_FIELDS) {
        requireField(val, field, label, ctx)
      }
    }
  }
}

// Asset Modal within Edit or Create Asset
export const AssetFormSchema = z
  .object({
    id: z.number().optional(),
    model: ModelSummarySchema.nullable().refine((val) => !!val, 'Model is required'),
    serialNumber: z.string().refine((val) => val.length > 0, 'Serial number is required'),
    ...specFieldsShape,
    errors: z.array(UpdateErrorSchema),
    comment: z.string().max(2000).nullable(),
  })
  .superRefine((val, ctx) => {
    // Errors are required iff Readiness = Has Errors. The reverse direction is
    // prevented by the UI: the errors input is only enabled when Has Errors is
    // the current selection. Validating both ways here would surface a confusing
    // error against a disabled field.
    if (
      isSelected(val.readiness) &&
      val.readiness.selected.status === HAS_ERRORS_READINESS &&
      val.errors.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['errors'],
        message: 'Add at least one error',
      })
    }

    const applicable = specApplicability(val.model?.asset_type ?? null)
    refineSpecFields(val, applicable, val.model?.is_colour ?? false, ctx)
  })

// Edit Technical Specifications modal — the spec-field subset of an existing
// asset. `isColour` and `assetType` are carried (not user-editable) so the
// colour-channel and applicability rules match the asset modal, which derives the
// same values from the selected model.
export const SpecsFormSchema = z
  .object({
    ...specFieldsShape,
    isColour: z.boolean(),
    assetType: z.string().nullable(),
  })
  .superRefine((val, ctx) => {
    const applicable = specApplicability(val.assetType)
    refineSpecFields(val, applicable, val.isColour, ctx)
  })

// Arrival Form Page within Edit or Create Arrival
export const ArrivalFormSchema = z.object({
  id: z.number().optional(),
  vendor: OrgSummarySchema.nullable().refine((val) => !!val, 'Vendor required'),
  transporter: OrgSummarySchema.nullable().refine((val) => !!val, 'Transporter required'),
  warehouse: WarehouseSelectOptionSchema.refine((val) => isSelected(val), 'Warehouse required'),
  comment: z.string(),
  assets: z.array(AssetFormSchema).nonempty('No assets in the arrival'),
})

export type AssetForm = {
  id?: number
  model: ModelSummary | null
  serialNumber: string
  meterBlack: number | null
  meterColour: number | null
  cassettes: number | null
  readiness: SelectOption<Status>
  countryOfOrigin: Country | null
  manufacturedYear: number | null
  component: Component | null
  coreFunctions: CoreFunction[]
  drumLifeC: number | null
  drumLifeM: number | null
  drumLifeY: number | null
  drumLifeK: number | null
  tonerLifeC: number | null
  tonerLifeM: number | null
  tonerLifeY: number | null
  tonerLifeK: number | null
  errors: UpdateError[]
  comment: string | null
}

export type SpecsForm = {
  readiness: SelectOption<Status>
  countryOfOrigin: Country | null
  manufacturedYear: number | null
  meterBlack: number | null
  meterColour: number | null
  cassettes: number | null
  component: Component | null
  coreFunctions: CoreFunction[]
  drumLifeC: number | null
  drumLifeM: number | null
  drumLifeY: number | null
  drumLifeK: number | null
  tonerLifeC: number | null
  tonerLifeM: number | null
  tonerLifeY: number | null
  tonerLifeK: number | null
  isColour: boolean
  assetType: string | null
}

export type ArrivalForm = {
  id?: number
  vendor: OrgSummary | null
  transporter: OrgSummary | null
  warehouse: SelectOption<Warehouse>
  comment: string
  assets: AssetForm[]
}

export const ArrivalMetadataFormSchema = z.object({
  vendor: OrgSummarySchema.nullable().refine((val) => !!val, 'Vendor required'),
  transporter: OrgSummarySchema.nullable().refine((val) => !!val, 'Transporter required'),
  warehouse: WarehouseSelectOptionSchema.refine((val) => isSelected(val), 'Warehouse required'),
  comment: z.string(),
})

export type ArrivalMetadataForm = {
  vendor: OrgSummary | null
  transporter: OrgSummary | null
  warehouse: SelectOption<Warehouse>
  comment: string
}
