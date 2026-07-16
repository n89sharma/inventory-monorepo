import { TechnicalSpecsFields } from '@/components/asset-details/technical-specs-fields'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useAssetStore } from '@/data/store/asset-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { specApplicability } from '@/lib/asset-spec-applicability'
import { flattenFieldErrors } from '@/lib/utils'
import { SpecsFormSchema, type SpecsForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { AssetDetails, AssetError } from 'shared-types'
import { toast } from 'sonner'

interface EditSpecsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: AssetError[]
}

// Readiness follows the asset's errors (see assetErrorService): HAS_ERRORS is never
// chosen by hand, so the specs picker always disables it. While any error is open the
// whole picker is locked — readiness stays on the enforced HAS_ERRORS.
const HAS_ERRORS_READINESS = 'HAS_ERRORS'

const EMPTY_SPECS_FORM: SpecsForm = {
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
  isColour: false,
  assetType: null,
}

export function EditSpecsModal({
  open,
  onOpenChange,
  assetDetails,
  accessories,
  errors,
}: EditSpecsModalProps) {
  const updateAssetSpecs = useAssetStore((state) => state.updateAssetSpecs)
  const coreFunctions = useReferenceDataStore((state) => state.coreFunctions)
  const readinesses = useReferenceDataStore((state) => state.readinesses)
  const countries = useReferenceDataStore((state) => state.countries)
  const components = useReferenceDataStore((state) => state.components)

  const hasOpenError = errors.some((e) => !e.is_fixed)
  const readinessDisabledStatuses = useMemo(
    () => (hasOpenError ? readinesses.map((r) => r.status) : [HAS_ERRORS_READINESS]),
    [hasOpenError, readinesses],
  )

  const values = useMemo<SpecsForm>(() => {
    if (!assetDetails) return EMPTY_SPECS_FORM
    const { specs } = assetDetails
    const readiness = readinesses.find((r) => r.status === assetDetails.readiness)
    return {
      readiness: readiness ? getSelectOption(readiness) : UNSELECTED,
      countryOfOrigin: countries.find((c) => c.name === assetDetails.country_of_origin) ?? null,
      manufacturedYear: assetDetails.manufactured_year,
      meterBlack: specs.meter_black,
      meterColour: specs.meter_colour,
      cassettes: specs.cassettes,
      component:
        components.find(
          (c) => c.brand_id === assetDetails.brand_id && c.name === specs.internal_finisher,
        ) ?? null,
      coreFunctions: coreFunctions.filter((cf) => accessories.includes(cf.accessory)),
      drumLifeC: specs.drum_life_c,
      drumLifeM: specs.drum_life_m,
      drumLifeY: specs.drum_life_y,
      drumLifeK: specs.drum_life_k,
      tonerLifeC: specs.toner_life_c,
      tonerLifeM: specs.toner_life_m,
      tonerLifeY: specs.toner_life_y,
      tonerLifeK: specs.toner_life_k,
      isColour: assetDetails.is_colour,
      assetType: assetDetails.asset_type,
    }
  }, [assetDetails, readinesses, countries, components, coreFunctions, accessories])

  const form = useForm<SpecsForm>({
    resolver: zodResolver(SpecsFormSchema),
    values,
  })
  const isSubmitting = form.formState.isSubmitting

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  if (!assetDetails) return null

  const applicable = specApplicability(assetDetails.asset_type)

  async function onValid(formValues: SpecsForm) {
    if (!isSelected(formValues.readiness)) return
    try {
      await updateAssetSpecs(assetDetails!.barcode, {
        readiness_id: formValues.readiness.selected.id,
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
        accessory_names: formValues.coreFunctions.map((cf) => cf.accessory),
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
          <TechnicalSpecsFields
            control={form.control}
            isColour={assetDetails.is_colour}
            brandId={assetDetails.brand_id}
            applicable={applicable}
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
