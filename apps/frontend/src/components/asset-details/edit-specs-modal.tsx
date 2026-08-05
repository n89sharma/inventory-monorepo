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
import { InlineWarning } from '@/components/shared/inline-warning'
import { ControlledSearchSelectField } from '@/components/shared/search-select/controlled-search-select-field'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useAssetStore } from '@/data/store/asset-store'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import {
  getSpecificationFieldVisibility,
  type SpecificationFieldVisibility,
} from '@/lib/asset-spec-applicability'
import { KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { modelLabel } from '@/lib/reference-labels'
import { flattenFieldErrors } from '@/lib/utils'
import { SpecsFormSchema, type SpecsForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import type { AssetDetails, AssetError, CoreFunction } from 'shared-types'
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
// whole picker is locked — readiness stays on the enforced HAS_ERRORS.
const HAS_ERRORS_READINESS = 'HAS_ERRORS'

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

// Fields the new model's asset type hides are dropped rather than carried over from
// the previous model, so a save cannot persist a value the form no longer shows.
function clearHiddenSpecFields(
  formValues: SpecsForm,
  visibility: SpecificationFieldVisibility,
): SpecsForm {
  return {
    ...formValues,
    countryOfOrigin: visibility.manufacturingOrigin ? formValues.countryOfOrigin : null,
    manufacturedYear: visibility.manufacturingOrigin ? formValues.manufacturedYear : null,
    meterBlack: visibility.meter ? formValues.meterBlack : null,
    meterColour: visibility.meter ? formValues.meterColour : null,
    cassettes: visibility.cassettes ? formValues.cassettes : null,
    component: visibility.internalFinisher ? formValues.component : null,
    coreFunctions: visibility.coreFunctions ? formValues.coreFunctions : [],
    drumLifeC: visibility.consumables ? formValues.drumLifeC : null,
    drumLifeM: visibility.consumables ? formValues.drumLifeM : null,
    drumLifeY: visibility.consumables ? formValues.drumLifeY : null,
    drumLifeK: visibility.consumables ? formValues.drumLifeK : null,
    tonerLifeC: visibility.consumables ? formValues.tonerLifeC : null,
    tonerLifeM: visibility.consumables ? formValues.tonerLifeM : null,
    tonerLifeY: visibility.consumables ? formValues.tonerLifeY : null,
    tonerLifeK: visibility.consumables ? formValues.tonerLifeK : null,
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
  const models = useModelStore((state) => state.models)
  const readinesses = useReferenceDataStore((state) => state.readinesses)
  const countries = useReferenceDataStore((state) => state.countries)
  const components = useReferenceDataStore((state) => state.components)

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
  const brandId = modelSelection?.brand_id ?? null
  const isColourModel = modelSelection?.is_colour ?? false
  const visibility = getSpecificationFieldVisibility(modelSelection?.asset_type ?? null)
  const brandChanged = brandId !== null && brandId !== (assetDetails?.brand_id ?? null)

  const readinessDisabledStatuses = useMemo(
    () =>
      hasOpenError && !brandChanged ? readinesses.map((r) => r.status) : [HAS_ERRORS_READINESS],
    [hasOpenError, brandChanged, readinesses],
  )

  // Components and errors are both brand-scoped, so a move between two distinct
  // brands drops the internal finisher and releases the enforced HAS_ERRORS
  // readiness — the backend clears the errors that were holding it.
  const prevBrandRef = useRef<number | null | undefined>(undefined)
  useEffect(() => {
    const prev = prevBrandRef.current
    if (prev && brandId && prev !== brandId) {
      form.setValue('component', null, { shouldDirty: true, shouldValidate: true })
      const readiness = form.getValues('readiness')
      if (isSelected(readiness) && readiness.selected.status === HAS_ERRORS_READINESS) {
        form.setValue('readiness', UNSELECTED, { shouldDirty: true, shouldValidate: true })
      }
    }
    prevBrandRef.current = brandId
  }, [brandId, form])

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  if (!assetDetails) return null

  async function onValid(rawValues: SpecsForm) {
    if (!isSelected(rawValues.readiness) || !rawValues.model) return
    const model = rawValues.model
    const formValues = clearHiddenSpecFields(
      rawValues,
      getSpecificationFieldVisibility(model.asset_type),
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
      })
      form.reset(formValues)
      toast.success('Specifications updated.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  function onInvalid(errors: FieldErrors<SpecsForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
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
              />
            </HorizontalField>
            <HorizontalField label="Serial Number" required>
              <ControlledTextInput
                control={form.control}
                name="serialNumber"
                className={INPUT_WIDTH}
              />
            </HorizontalField>
          </div>

          {brandChanged && errors.length > 0 && (
            <InlineWarning>
              Changing to a different brand will remove the {errors.length} recorded error
              {errors.length === 1 ? '' : 's'} from this asset.
            </InlineWarning>
          )}

          <TechnicalSpecsFields
            control={form.control}
            isColour={isColourModel}
            brandId={brandId}
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
          <Button onClick={submit} type="button" disabled={isSubmitting}>
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
    </Dialog>
  )
}
