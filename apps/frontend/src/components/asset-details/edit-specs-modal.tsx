import {
  ControlledTextInput,
  INPUT_WIDTH,
  TechnicalSpecsFields,
} from '@/components/asset-details/technical-specs-fields'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { HorizontalField } from '@/components/shared/horizontal-field'
import { ControlledSearchSelectField } from '@/components/shared/search-select/controlled-search-select-field'
import { ConfirmActionDialog } from '@/components/shared/confirm-action-dialog'
import { DuplicateSerialWarning } from '@/components/shared/duplicate-serial-warning'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useAssetStore } from '@/data/store/asset-store'
import { useModels } from '@/hooks/use-model'
import { useReadinesses, useAssetComponents, useCountries } from '@/hooks/use-reference-data'
import { useSerialNumberCheck } from '@/hooks/use-serial-number-check'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  getSpecificationFieldVisibility,
  type SpecificationFieldVisibility,
} from '@/lib/asset-spec-applicability'
import { DISCARD_USER_EDITS, KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { modelLabel } from '@/lib/reference-labels'
import { flattenFieldErrors } from '@/lib/utils'
import { SpecsFormSchema, type SpecsForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon, WarningIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import {
  type AssetDetails,
  type AssetError,
  type CoreFunction,
  type ModelSummary,
} from 'shared-types'
import { toast } from 'sonner'

interface EditSpecsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  accessories: CoreFunction[]
  errors: AssetError[]
}

// Readiness follows the asset's errors (see assetErrorService): HAS_ERRORS is never
// chosen by hand, so the specs picker always disables it. While any error is open the
// whole picker is locked — readiness stays on the enforced HAS_ERRORS — unless the
// model moves to another brand, which clears the errors and releases the readiness.
const HAS_ERRORS_READINESS = 'HAS_ERRORS'
const UNTESTED_READINESS = 'UNTESTED'

// An asset's specs are edited on their own; there is no unsaved sibling list to compare against.
const NO_DRAFT_SERIAL_NUMBERS: string[] = []

const EMPTY_SPECS_FORM: SpecsForm = {
  model: null,
  serialNumber: '',
  readiness: UNSELECTED,
  countryOfOrigin: null,
  manufacturedYear: null,
  meterBlack: null,
  meterColour: null,
  cassettes: null,
  component: null,
  coreFunctions: [],
  drumLifeC: null,
  drumLifeM: null,
  drumLifeY: null,
  drumLifeK: null,
  tonerLifeC: null,
  tonerLifeM: null,
  tonerLifeY: null,
  tonerLifeK: null,
}

const CLEARED_MANUFACTURING_ORIGIN = { countryOfOrigin: null, manufacturedYear: null } as const
const CLEARED_METER = { meterBlack: null, meterColour: null } as const
const CLEARED_CASSETTES = { cassettes: null } as const
const CLEARED_INTERNAL_FINISHER = { component: null } as const
const CLEARED_CORE_FUNCTIONS = { coreFunctions: [] as CoreFunction[] }
const CLEARED_CONSUMABLES = {
  drumLifeC: null,
  drumLifeM: null,
  drumLifeY: null,
  drumLifeK: null,
  tonerLifeC: null,
  tonerLifeM: null,
  tonerLifeY: null,
  tonerLifeK: null,
} as const
const CLEARED_COLOUR_CHANNELS = {
  meterColour: null,
  drumLifeC: null,
  drumLifeM: null,
  drumLifeY: null,
  tonerLifeC: null,
  tonerLifeM: null,
  tonerLifeY: null,
} as const

// Fields the new model hides — by its asset type, or by being mono, which hides the
// C/M/Y channels — are dropped rather than carried over from the previous model, so a
// save cannot persist a value the form no longer shows.
function clearHiddenSpecFields(
  formValues: SpecsForm,
  visibility: SpecificationFieldVisibility,
  isColour: boolean,
): SpecsForm {
  return {
    ...formValues,
    ...(visibility.manufacturingOrigin ? {} : CLEARED_MANUFACTURING_ORIGIN),
    ...(visibility.meter ? {} : CLEARED_METER),
    ...(visibility.cassettes ? {} : CLEARED_CASSETTES),
    ...(visibility.internalFinisher ? {} : CLEARED_INTERNAL_FINISHER),
    ...(visibility.coreFunctions ? {} : CLEARED_CORE_FUNCTIONS),
    ...(visibility.consumables ? {} : CLEARED_CONSUMABLES),
    ...(isColour ? {} : CLEARED_COLOUR_CHANNELS),
  }
}

export function EditSpecsModal({
  open,
  onOpenChange,
  assetDetails,
  accessories,
  errors,
}: EditSpecsModalProps) {
  const updateAssetSpecs = useAssetStore((state) => state.updateAssetSpecs)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const models = useModels()
  const readinesses = useReadinesses()
  const countries = useCountries()
  const components = useAssetComponents()

  const hasOpenError = errors.some((e) => !e.is_fixed)

  const values = useMemo<SpecsForm>(() => {
    if (!assetDetails) return EMPTY_SPECS_FORM
    const { specs } = assetDetails
    const readiness = readinesses.find((r) => r.status === assetDetails.readiness)
    return {
      model: models.find((m) => m.id === assetDetails.model_id) ?? null,
      serialNumber: assetDetails.serial_number,
      readiness: readiness ? getSelectOption(readiness) : UNSELECTED,
      countryOfOrigin: countries.find((c) => c.id === assetDetails.country_of_origin_id) ?? null,
      manufacturedYear: assetDetails.manufactured_year,
      meterBlack: specs.meter_black,
      meterColour: specs.meter_colour,
      cassettes: specs.cassettes,
      component: components.find((c) => c.id === specs.internal_finisher_id) ?? null,
      coreFunctions: accessories,
      drumLifeC: specs.drum_life_c,
      drumLifeM: specs.drum_life_m,
      drumLifeY: specs.drum_life_y,
      drumLifeK: specs.drum_life_k,
      tonerLifeC: specs.toner_life_c,
      tonerLifeM: specs.toner_life_m,
      tonerLifeY: specs.toner_life_y,
      tonerLifeK: specs.toner_life_k,
    }
  }, [assetDetails, models, readinesses, countries, components, accessories])

  const form = useForm<SpecsForm>({
    resolver: zodResolver(SpecsFormSchema),
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })
  const isSubmitting = form.formState.isSubmitting

  // Everything the fields render from follows the picked model, not the stored asset,
  // so switching model re-derives the applicable fields before the save.
  const modelSelection = useWatch({ control: form.control, name: 'model' })
  const currBrandId = modelSelection?.brand_id ?? null
  const isColourModel = modelSelection?.is_colour ?? false
  const visibility = getSpecificationFieldVisibility(modelSelection?.asset_type ?? null)
  const brandChanged = currBrandId !== null && currBrandId !== (assetDetails?.brand_id ?? null)

  const readinessDisabledStatuses = useMemo(
    () =>
      hasOpenError && !brandChanged ? readinesses.map((r) => r.status) : [HAS_ERRORS_READINESS],
    [hasOpenError, brandChanged, readinesses],
  )

  const currSerialNumber = useWatch({ control: form.control, name: 'serialNumber' })
  // The stored serial, so editing any other field on an asset that already shares one is not gated.
  const persistedAsset = useMemo(
    () =>
      assetDetails
        ? { barcode: assetDetails.barcode, serialNumber: assetDetails.serial_number }
        : null,
    [assetDetails],
  )
  const serialCheck = useSerialNumberCheck({
    serialNumber: currSerialNumber ?? '',
    persistedAsset,
    draftSerialNumbers: NO_DRAFT_SERIAL_NUMBERS,
  })
  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => {
    form.reset(undefined, DISCARD_USER_EDITS)
  })

  if (!assetDetails) return null

  // Components and errors are both brand-scoped, so picking a model from a brand other
  // than the asset's drops the internal finisher and releases the enforced HAS_ERRORS
  // readiness — the backend clears the errors that were holding it. The release lands
  // on UNTESTED rather than the PP_OK that fixing the last error yields, since the
  // asset has not been checked against the new brand's error list. Mirrors
  // assetSpecsService so the picker shows the readiness that will be saved.
  function handleModelSelected(currModel: ModelSummary) {
    if (currModel.brand_id === assetDetails!.brand_id) return

    form.setValue('component', null, { shouldDirty: true, shouldValidate: true })
    const readiness = form.getValues('readiness')
    const untested = readinesses.find((r) => r.status === UNTESTED_READINESS)
    if (untested && isSelected(readiness) && readiness.selected.status === HAS_ERRORS_READINESS) {
      form.setValue('readiness', getSelectOption(untested), {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }

  // Passed in rather than read from state: the confirm dialog sets it and submits in the same
  // tick, when a state read would still see the previous value.
  async function onValid(rawValues: SpecsForm, duplicateSerialAcknowledged: boolean) {
    if (!isSelected(rawValues.readiness) || !rawValues.model) return
    const model = rawValues.model
    const formValues = clearHiddenSpecFields(
      rawValues,
      getSpecificationFieldVisibility(model.asset_type),
      model.is_colour,
    )
    try {
      await updateAssetSpecs(assetDetails!.barcode, {
        model_id: model.id,
        serial_number: formValues.serialNumber,
        readiness_id: rawValues.readiness.selected.id,
        country_of_origin_id: formValues.countryOfOrigin?.id ?? null,
        manufactured_year: formValues.manufacturedYear,
        cassettes: formValues.cassettes,
        component_id: formValues.component?.id ?? null,
        meter_black: formValues.meterBlack,
        meter_colour: formValues.meterColour,
        drum_life_c: formValues.drumLifeC,
        drum_life_m: formValues.drumLifeM,
        drum_life_y: formValues.drumLifeY,
        drum_life_k: formValues.drumLifeK,
        toner_life_c: formValues.tonerLifeC,
        toner_life_m: formValues.tonerLifeM,
        toner_life_y: formValues.tonerLifeY,
        toner_life_k: formValues.tonerLifeK,
        accessory_ids: formValues.coreFunctions.map((cf) => cf.id),
        duplicate_serial_acknowledged: duplicateSerialAcknowledged,
      })
      form.reset(formValues, DISCARD_USER_EDITS)
      toast.success('Specifications updated.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  function onInvalid(errors: FieldErrors<SpecsForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  // Validation runs first, so field errors surface before the duplicate prompt and the prompt
  // only ever appears on a payload that is ready to save. Nothing is acknowledged in advance:
  // every save attempt on a matching serial goes back through the confirmation.
  function submit() {
    form.handleSubmit((values) => {
      if (serialCheck.hasMatch) {
        setDuplicateConfirmOpen(true)
        return
      }
      return onValid(values, false)
    }, onInvalid)()
  }

  function confirmDuplicateSerial() {
    setDuplicateConfirmOpen(false)
    form.handleSubmit((values) => onValid(values, true), onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="md:max-w-175 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Technical Specifications</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-6 flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1 pt-2 pb-1"
        >
          <div className="flex flex-col gap-2">
            <HorizontalField label="Model" required>
              <ControlledSearchSelectField
                control={form.control}
                name="model"
                options={models}
                getLabel={modelLabel}
                clearLabel="Clear model"
                className={INPUT_WIDTH}
                onSelectionChange={handleModelSelected}
              />
            </HorizontalField>
            <HorizontalField label="Serial Number" required>
              <div className="flex flex-col gap-2">
                <ControlledTextInput
                  control={form.control}
                  name="serialNumber"
                  className={INPUT_WIDTH}
                />
                <DuplicateSerialWarning check={serialCheck} />
              </div>
            </HorizontalField>
          </div>

          <TechnicalSpecsFields
            control={form.control}
            isColour={isColourModel}
            brandId={currBrandId}
            visibility={visibility}
            readinessDisabledStatuses={readinessDisabledStatuses}
          />
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => guard.onOpenChange(false)}
            type="button"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            type="button"
            disabled={isSubmitting || serialCheck.isChecking || serialCheck.isBlocked}
          >
            {isSubmitting ? (
              <>
                <CircleNotchIcon className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={guard.confirmOpen}
        onOpenChange={guard.setConfirmOpen}
        onDiscard={guard.discard}
      />
      <ConfirmActionDialog
        open={duplicateConfirmOpen}
        onOpenChange={setDuplicateConfirmOpen}
        title="Duplicate serial number"
        confirmLabel="Confirm Duplicate"
        icon={<WarningIcon />}
        onConfirm={confirmDuplicateSerial}
      >
        <DuplicateSerialWarning check={serialCheck} />
      </ConfirmActionDialog>
    </Dialog>
  )
}
