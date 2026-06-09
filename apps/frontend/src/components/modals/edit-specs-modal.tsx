import { TechnicalSpecsFields } from "@/components/custom/technical-specs-fields"
import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog"
import { useAssetStore } from "@/data/store/asset-store"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { flattenFieldErrors } from "@/lib/utils"
import { SpecsFormSchema, type SpecsForm } from "@/ui-types/arrival-form-types"
import { getSelectOption, isSelected, UNSELECTED } from "@/ui-types/select-option-types"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useEffect } from "react"
import { useForm, type FieldErrors } from "react-hook-form"
import type { AssetDetails } from "shared-types"
import { toast } from "sonner"

interface EditSpecsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  accessories: string[]
}

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
}

export function EditSpecsModal({ open, onOpenChange, assetDetails, accessories }: EditSpecsModalProps) {
  const updateAssetSpecs = useAssetStore(state => state.updateAssetSpecs)
  const coreFunctions = useReferenceDataStore(state => state.coreFunctions)
  const readinesses = useReferenceDataStore(state => state.readinesses)
  const countries = useReferenceDataStore(state => state.countries)
  const components = useReferenceDataStore(state => state.components)

  const form = useForm<SpecsForm>({
    resolver: zodResolver(SpecsFormSchema),
    defaultValues: EMPTY_SPECS_FORM,
  })
  const isSubmitting = form.formState.isSubmitting

  useEffect(() => {
    if (open && assetDetails) {
      const { specs } = assetDetails
      const readiness = readinesses.find(r => r.status === assetDetails.readiness)
      form.reset({
        readiness: readiness ? getSelectOption(readiness) : UNSELECTED,
        countryOfOrigin: countries.find(c => c.name === assetDetails.country_of_origin) ?? null,
        manufacturedYear: assetDetails.manufactured_year,
        meterBlack: specs.meter_black,
        meterColour: specs.meter_colour,
        cassettes: specs.cassettes,
        component: components.find(
          c => c.brand_name === assetDetails.brand && c.name === specs.internal_finisher,
        ) ?? null,
        coreFunctions: coreFunctions.filter(cf => accessories.includes(cf.accessory)),
        drumLifeC: specs.drum_life_c,
        drumLifeM: specs.drum_life_m,
        drumLifeY: specs.drum_life_y,
        drumLifeK: specs.drum_life_k,
        tonerLifeC: specs.toner_life_c,
        tonerLifeM: specs.toner_life_m,
        tonerLifeY: specs.toner_life_y,
        tonerLifeK: specs.toner_life_k,
        isColour: assetDetails.is_colour,
      })
    }
  }, [open])

  if (!assetDetails) return null

  async function onValid(values: SpecsForm) {
    if (!isSelected(values.readiness)) return
    try {
      await updateAssetSpecs(assetDetails!.barcode, {
        readiness_id: values.readiness.selected.id,
        country_of_origin_id: values.countryOfOrigin?.id ?? null,
        manufactured_year: values.manufacturedYear,
        cassettes: values.cassettes,
        component_id: values.component?.id ?? null,
        meter_black: values.meterBlack,
        meter_colour: values.meterColour,
        drum_life_c: values.drumLifeC,
        drum_life_m: values.drumLifeM,
        drum_life_y: values.drumLifeY,
        drum_life_k: values.drumLifeK,
        toner_life_c: values.tonerLifeC,
        toner_life_m: values.tonerLifeM,
        toner_life_y: values.tonerLifeY,
        toner_life_k: values.tonerLifeK,
        accessory_names: values.coreFunctions.map(cf => cf.accessory),
      })
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-175 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Technical Specifications</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={e => e.preventDefault()}
          className="flex flex-col gap-6 flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1 pt-2 pb-1"
        >
          <TechnicalSpecsFields
            control={form.control}
            isColour={assetDetails.is_colour}
            brandName={assetDetails.brand}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} type="button" disabled={isSubmitting}>
            {isSubmitting ? <><CircleNotchIcon className="animate-spin" />Saving...</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
