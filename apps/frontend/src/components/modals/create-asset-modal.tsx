import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { AssetFormSchema, type ArrivalForm, type AssetForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import {
  Controller,
  useForm,
  useWatch,
  type UseFieldArrayAppend,
  type UseFieldArrayUpdate,
} from 'react-hook-form'
import type { ModelSummary, Status } from 'shared-types'
import { AssetErrorsEditor } from '../custom/asset-errors-editor'
import { ControlledSearchSelectField } from '../custom/controlled-search-select-field'
import { HorizontalField } from '../custom/horizontal-field'
import { SearchSelectInput } from '../custom/search-select-input'
import { ControlledTextInput, INPUT_WIDTH, TechnicalSpecsFields } from '../custom/technical-specs-fields'
import { UnsavedChangesDialog } from '../custom/unsaved-changes-dialog'
import { Button } from '../shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../shadcn/dialog'
import { Textarea } from '../shadcn/textarea'

const HAS_ERRORS_READINESS = 'HAS_ERRORS'

interface AssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addNewAsset?: UseFieldArrayAppend<ArrivalForm, 'assets'>
  updateAsset?: UseFieldArrayUpdate<ArrivalForm, 'assets'>
  editingAsset?: AssetForm | null
  editingIndex?: number | null
  onCreateAsset?: (asset: AssetForm) => Promise<void>
  onUpdateAsset?: (asset: AssetForm) => Promise<void>
}

export function AssetModal({
  open,
  onOpenChange,
  addNewAsset,
  updateAsset,
  editingAsset,
  editingIndex,
  onCreateAsset,
  onUpdateAsset,
}: AssetModalProps): React.JSX.Element {
  const isEditMode = editingAsset != null
  const [isSubmitting, setIsSubmitting] = useState(false)

  const modalConfig = {
    title: isEditMode ? 'Edit Asset' : 'Create Asset',
    submitLabel: isEditMode ? 'Update Asset' : 'Save Asset',
  }

  const newAssetForm = useForm<AssetForm>({
    resolver: zodResolver(AssetFormSchema),
    defaultValues: getDefaultNewAsset(),
  })
  const isDirty = newAssetForm.formState.isDirty
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const readinesses = useReferenceDataStore(state => state.readinesses)
  const brands = useReferenceDataStore(state => state.brands)
  const models = useModelStore(state => state.models)

  useEffect(() => {
    if (open && editingAsset) {
      newAssetForm.reset(editingAsset)
    } else if (open && !editingAsset) {
      newAssetForm.reset(getDefaultNewAsset(readinesses))
    }
  }, [open, editingAsset, readinesses])

  // Watch readiness + model to (a) drive the errors editor's enabled/brand state
  // and (b) clear errors on transitions: leaving HAS_ERRORS, or switching to a
  // model whose brand differs from the previous brand. Refs track the previous
  // observed value so the post-reset run doesn't fire a spurious clear.
  const readinessSelection = useWatch({ control: newAssetForm.control, name: 'readiness' })
  const modelSelection = useWatch({ control: newAssetForm.control, name: 'model' })
  const currentReadinessStatus = isSelected(readinessSelection)
    ? readinessSelection.selected.status
    : null
  const currentBrandName = modelSelection?.brand_name ?? null
  const isColourModel = modelSelection?.is_colour ?? false
  const brandId = currentBrandName
    ? brands.find(b => b.name === currentBrandName)?.id ?? null
    : null
  const isHasErrors = currentReadinessStatus === HAS_ERRORS_READINESS

  const prevReadinessRef = useRef<string | null | undefined>(undefined)
  const prevBrandRef = useRef<string | null | undefined>(undefined)

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
    if (prev && currentBrandName && prev !== currentBrandName) {
      newAssetForm.setValue('errors', [], { shouldDirty: true, shouldValidate: true })
    }
    prevBrandRef.current = currentBrandName
  }, [currentBrandName, newAssetForm])

  function getDefaultNewAsset(allReadinesses: Status[] = []) {
    const untested = allReadinesses.find(r => r.status === 'UNTESTED')
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

  async function onValidAsset(rawAsset: AssetForm) {
    const asset: AssetForm = {
      ...rawAsset,
      drumLifeC: rawAsset.drumLifeC ?? 0,
      drumLifeM: rawAsset.drumLifeM ?? 0,
      drumLifeY: rawAsset.drumLifeY ?? 0,
      tonerLifeC: rawAsset.tonerLifeC ?? 0,
      tonerLifeM: rawAsset.tonerLifeM ?? 0,
      tonerLifeY: rawAsset.tonerLifeY ?? 0,
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
        await onCreateAsset(asset)
        newAssetForm.reset(getDefaultNewAsset(readinesses))
        onOpenChange(false)
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

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isDirty) {
      setConfirmCloseOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  function discardAndClose() {
    setConfirmCloseOpen(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='md:max-w-175 max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>{modalConfig.title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => e.preventDefault()}
          className='flex flex-col gap-6 flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1 pt-2 pb-1'
        >

          <div className='flex flex-col gap-2'>
            <HorizontalField label='Model' required>
              <ControlledSearchSelectField
                control={newAssetForm.control}
                name='model'
                options={models}
                searchKey='model_name'
                getLabel={(m: ModelSummary) => `${m.brand_name} ${m.model_name}`}
                clearLabel='Clear model'
                className={INPUT_WIDTH}
              />
            </HorizontalField>
            <HorizontalField label='Serial Number' required>
              <ControlledTextInput
                control={newAssetForm.control}
                name='serialNumber'
                className={INPUT_WIDTH}
              />
            </HorizontalField>
          </div>

          <TechnicalSpecsFields
            control={newAssetForm.control}
            isColour={isColourModel}
            brandName={currentBrandName}
            renderAfterReadiness={
              <HorizontalField label='Errors' required={isHasErrors}>
                <Controller
                  control={newAssetForm.control}
                  name='errors'
                  render={({ field, fieldState }) => (
                    <AssetErrorsEditor
                      value={field.value}
                      onChange={field.onChange}
                      brandId={brandId}
                      disabled={!isHasErrors}
                      invalid={fieldState.invalid}
                      renderSearch={slot => <SearchSelectInput {...slot} placeholder="" className={INPUT_WIDTH} />}
                    />
                  )}
                />
              </HorizontalField>
            }
          />

          <HorizontalField label='Comment'>
            <Controller
              control={newAssetForm.control}
              name='comment'
              render={({ field }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              )}
            />
          </HorizontalField>

        </form>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => handleOpenChange(false)}
            type='button'
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={submitAsset} type='button' disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : modalConfig.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onDiscard={discardAndClose}
      />
    </Dialog>
  )
}
