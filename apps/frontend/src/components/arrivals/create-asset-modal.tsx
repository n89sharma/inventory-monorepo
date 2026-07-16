import { useAssetStore } from '@/data/store/asset-store'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { specApplicability } from '@/lib/asset-spec-applicability'
import { modelLabel } from '@/lib/reference-labels'
import { AssetFormSchema, type ArrivalForm, type AssetForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Controller,
  useForm,
  useWatch,
  type UseFieldArrayAppend,
  type UseFieldArrayUpdate,
} from 'react-hook-form'
import type { AssetSummary, Status } from 'shared-types'
import { toast } from 'sonner'
import { AssetErrorsEditor } from '../asset-details/asset-errors-editor'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Textarea } from '../shadcn/textarea'
import { ControlledSearchSelectField } from '../shared/search-select/controlled-search-select-field'
import { HorizontalField } from '../shared/horizontal-field'
import { SearchSelectInput } from '../shared/search-select/search-select-input'

import {
  ControlledTextInput,
  INPUT_WIDTH,
  TechnicalSpecsFields,
} from '@/components/asset-details/technical-specs-fields'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

const HAS_ERRORS_READINESS = 'HAS_ERRORS'

function getDefaultNewAsset(allReadinesses: Status[] = []): AssetForm {
  const untested = allReadinesses.find((r) => r.status === 'UNTESTED')
  return {
    serialNumber: '',
    model: null,
    readiness: untested ? getSelectOption(untested) : UNSELECTED,
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
    errors: [],
    comment: null,
  }
}

interface CreateAssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addNewAsset?: UseFieldArrayAppend<ArrivalForm, 'assets'>
  updateAsset?: UseFieldArrayUpdate<ArrivalForm, 'assets'>
  editingAsset?: AssetForm | null
  editingIndex?: number | null
  onCreateAsset?: (asset: AssetForm) => Promise<AssetSummary>
  onUpdateAsset?: (asset: AssetForm) => Promise<void>
}

export function CreateAssetModal({
  open,
  onOpenChange,
  addNewAsset,
  updateAsset,
  editingAsset,
  editingIndex,
  onCreateAsset,
  onUpdateAsset,
}: CreateAssetModalProps): React.JSX.Element {
  const isEditMode = editingAsset != null
  const [isSubmitting, setIsSubmitting] = useState(false)

  const modalConfig = {
    title: isEditMode ? 'Edit Asset' : 'Create Asset',
    submitLabel: isEditMode ? 'Update Asset' : 'Save Asset',
  }

  const readinesses = useReferenceDataStore((state) => state.readinesses)
  const models = useModelStore((state) => state.models)
  const printBarcodes = useAssetStore((state) => state.printBarcodes)

  const values = useMemo(
    () => editingAsset ?? getDefaultNewAsset(readinesses),
    [editingAsset, readinesses],
  )
  const newAssetForm = useForm<AssetForm>({
    resolver: zodResolver(AssetFormSchema),
    values,
  })

  const guard = useUnsavedChangesGuard(newAssetForm.formState.isDirty, onOpenChange, () =>
    newAssetForm.reset(),
  )

  // Watch readiness + model to (a) drive the errors editor's enabled/brand state
  // and (b) clear errors on transitions: leaving HAS_ERRORS, or switching to a
  // model whose brand differs from the previous brand. Refs track the previous
  // observed value so the post-reset run doesn't fire a spurious clear.
  const readinessSelection = useWatch({ control: newAssetForm.control, name: 'readiness' })
  const modelSelection = useWatch({ control: newAssetForm.control, name: 'model' })
  const currentReadinessStatus = isSelected(readinessSelection)
    ? readinessSelection.selected.status
    : null
  const brandId = modelSelection?.brand_id ?? null
  const isColourModel = modelSelection?.is_colour ?? false
  const applicable = specApplicability(modelSelection?.asset_type ?? null)
  const isHasErrors = currentReadinessStatus === HAS_ERRORS_READINESS

  const prevReadinessRef = useRef<string | null | undefined>(undefined)
  const prevBrandRef = useRef<number | null | undefined>(undefined)

  useEffect(() => {
    const prev = prevReadinessRef.current
    if (prev === HAS_ERRORS_READINESS && currentReadinessStatus !== HAS_ERRORS_READINESS) {
      newAssetForm.setValue('errors', [], { shouldDirty: true, shouldValidate: true })
    }
    prevReadinessRef.current = currentReadinessStatus
  }, [currentReadinessStatus, newAssetForm])

  useEffect(() => {
    // Clear only when transitioning between two distinct non-null brands.
    // Going from "no model" → "a model" keeps any errors the user added before
    // picking the model; the backend will reject a brand mismatch on submit.
    const prev = prevBrandRef.current
    if (prev && brandId && prev !== brandId) {
      newAssetForm.setValue('errors', [], { shouldDirty: true, shouldValidate: true })
    }
    prevBrandRef.current = brandId
  }, [brandId, newAssetForm])

  async function printCreatedAssetBarcode(barcode: string) {
    try {
      await printBarcodes([barcode])
    } catch {
      toast.error('Failed to print barcode', { position: 'top-center' })
    }
  }

  async function onValidAsset(rawAsset: AssetForm) {
    // Fields hidden for this asset type are left null by validation; coerce every
    // numeric spec to a non-null number for the CreateAsset contract (0 for
    // non-applicable), and drop the internal finisher when it doesn't apply.
    const applicableForAsset = specApplicability(rawAsset.model?.asset_type ?? null)
    const asset: AssetForm = {
      ...rawAsset,
      meterBlack: rawAsset.meterBlack ?? 0,
      meterColour: rawAsset.meterColour ?? 0,
      cassettes: rawAsset.cassettes ?? 0,
      component: applicableForAsset.internalFinisher ? rawAsset.component : null,
      drumLifeC: rawAsset.drumLifeC ?? 0,
      drumLifeM: rawAsset.drumLifeM ?? 0,
      drumLifeY: rawAsset.drumLifeY ?? 0,
      drumLifeK: rawAsset.drumLifeK ?? 0,
      tonerLifeC: rawAsset.tonerLifeC ?? 0,
      tonerLifeM: rawAsset.tonerLifeM ?? 0,
      tonerLifeY: rawAsset.tonerLifeY ?? 0,
      tonerLifeK: rawAsset.tonerLifeK ?? 0,
    }
    if (isEditMode && onUpdateAsset) {
      setIsSubmitting(true)
      try {
        await onUpdateAsset(asset)
        newAssetForm.reset(asset)
        onOpenChange(false)
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    if (isEditMode) {
      updateAsset!(editingIndex!, asset)
      newAssetForm.reset(asset)
      onOpenChange(false)
      return
    }
    if (onCreateAsset) {
      setIsSubmitting(true)
      try {
        const created = await onCreateAsset(asset)
        newAssetForm.reset(getDefaultNewAsset(readinesses))
        onOpenChange(false)
        void printCreatedAssetBarcode(created.barcode)
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    addNewAsset!(asset)
    newAssetForm.reset(getDefaultNewAsset(readinesses))
    onOpenChange(false)
  }

  function submitAsset() {
    newAssetForm.handleSubmit(onValidAsset)()
  }

  return (
    <Dialog open={open} onOpenChange={guard.onOpenChange}>
      <DialogContent className="md:max-w-175 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{modalConfig.title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col gap-6 flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1 pt-2 pb-1"
        >
          <div className="flex flex-col gap-2">
            <HorizontalField label="Model" required>
              <ControlledSearchSelectField
                control={newAssetForm.control}
                name="model"
                options={models}
                getLabel={modelLabel}
                clearLabel="Clear model"
                className={INPUT_WIDTH}
              />
            </HorizontalField>
            <HorizontalField label="Serial Number" required>
              <ControlledTextInput
                control={newAssetForm.control}
                name="serialNumber"
                className={INPUT_WIDTH}
              />
            </HorizontalField>
          </div>

          <TechnicalSpecsFields
            control={newAssetForm.control}
            isColour={isColourModel}
            brandId={brandId}
            applicable={applicable}
            renderAfterReadiness={
              <HorizontalField label="Errors" required={isHasErrors}>
                <Controller
                  control={newAssetForm.control}
                  name="errors"
                  render={({ field, fieldState }) => (
                    <AssetErrorsEditor
                      value={field.value}
                      onChange={field.onChange}
                      brandId={brandId}
                      disabled={!isHasErrors}
                      invalid={fieldState.invalid}
                      statusToggleable={false}
                      renderSearch={(slot) => (
                        <SearchSelectInput {...slot} placeholder="" className={INPUT_WIDTH} />
                      )}
                    />
                  )}
                />
              </HorizontalField>
            }
          />

          <HorizontalField label="Comment">
            <Controller
              control={newAssetForm.control}
              name="comment"
              render={({ field }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              )}
            />
          </HorizontalField>
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
          <Button onClick={submitAsset} type="button" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : modalConfig.submitLabel}
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
