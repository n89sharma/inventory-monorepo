import { useAssetStore } from '@/data/store/asset-store'
import { useModels } from '@/hooks/use-model'
import { useReadinesses, useErrorCodes } from '@/hooks/use-reference-data'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { getSpecificationFieldVisibility } from '@/lib/asset-spec-applicability'
import { DISCARD_USER_EDITS, KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { DuplicateSerialWarning } from '@/components/shared/duplicate-serial-warning'
import { useSerialNumberCheck, type PersistedAsset } from '@/hooks/use-serial-number-check'
import { modelLabel } from '@/lib/reference-labels'
import { AssetFormSchema, type ArrivalForm, type AssetForm } from '@/ui-types/arrival-form-types'
import { getSelectOption, isSelected, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import {
  Controller,
  useForm,
  useWatch,
  type UseFieldArrayAppend,
  type UseFieldArrayUpdate,
} from 'react-hook-form'
import type { AssetSummary, ModelSummary, Status } from 'shared-types'
import { WarningIcon } from '@phosphor-icons/react'
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
import { ConfirmActionDialog } from '../shared/confirm-action-dialog'
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
    isDamaged: false,
    damageNotes: null,
    duplicateSerialAcknowledged: false,
  }
}

const NO_DRAFT_SERIAL_NUMBERS: string[] = []

interface CreateAssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addNewAsset?: UseFieldArrayAppend<ArrivalForm, 'assets'>
  updateAsset?: UseFieldArrayUpdate<ArrivalForm, 'assets'>
  editingAsset?: AssetForm | null
  editingIndex?: number | null
  onCreateAsset?: (asset: AssetForm) => Promise<AssetSummary>
  onUpdateAsset?: (asset: AssetForm) => Promise<void>
  // Serial numbers of the other assets already composed into this arrival but not yet saved.
  draftSerialNumbers?: string[]
  // Set only when editing an asset that already exists in the database, so an unchanged serial
  // is neither checked nor gated. A draft row has none: the arrival submit checks it as new.
  persistedAsset?: PersistedAsset | null
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
  draftSerialNumbers = NO_DRAFT_SERIAL_NUMBERS,
  persistedAsset = null,
}: CreateAssetModalProps): React.JSX.Element {
  const isEditMode = editingAsset != null
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)

  const modalConfig = {
    title: isEditMode ? 'Edit Asset' : 'Create Asset',
    submitLabel: isEditMode ? 'Update Asset' : 'Save Asset',
  }

  const readinesses = useReadinesses()
  const allErrors = useErrorCodes()
  const models = useModels()
  const printBarcodes = useAssetStore((state) => state.printBarcodes)

  const values = useMemo(
    () => editingAsset ?? getDefaultNewAsset(readinesses),
    [editingAsset, readinesses],
  )
  const newAssetForm = useForm<AssetForm>({
    resolver: zodResolver(AssetFormSchema),
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })

  const guard = useUnsavedChangesGuard(newAssetForm.formState.isDirty, onOpenChange, () => {
    newAssetForm.reset(undefined, DISCARD_USER_EDITS)
  })

  // Watch readiness + model to drive the errors editor's enabled/brand state.
  const readinessSelection = useWatch({ control: newAssetForm.control, name: 'readiness' })
  const modelSelection = useWatch({ control: newAssetForm.control, name: 'model' })
  const currSerialNumber = useWatch({ control: newAssetForm.control, name: 'serialNumber' })
  const serialCheck = useSerialNumberCheck({
    serialNumber: currSerialNumber ?? '',
    persistedAsset,
    draftSerialNumbers,
  })
  const currReadinessStatus = isSelected(readinessSelection)
    ? readinessSelection.selected.status
    : null
  const currBrandId = modelSelection?.brand_id ?? null
  const isColourModel = modelSelection?.is_colour ?? false
  const visibility = getSpecificationFieldVisibility(modelSelection?.asset_type ?? null)
  const isHasErrors = currReadinessStatus === HAS_ERRORS_READINESS

  // Errors only belong to an asset that is HAS_ERRORS, so any other readiness empties them.
  // An invariant, not a transition: the previous readiness never has to be known.
  function handleReadinessSelected(newReadiness: Status | null) {
    if (newReadiness?.status === HAS_ERRORS_READINESS) return
    if (newAssetForm.getValues('errors').length === 0) return
    newAssetForm.setValue('errors', [], { shouldDirty: true, shouldValidate: true })
  }

  // Errors are brand-scoped, so an error only survives a model pick when it belongs to
  // that model's brand. The errors editor allows any brand while no model is picked,
  // which is where the mismatches come from.
  function handleModelSelected(currModel: ModelSummary) {
    const brandIdByErrorId = new Map(allErrors.map((e) => [e.id, e.brand_id]))
    const currErrors = newAssetForm.getValues('errors')
    const keptErrors = currErrors.filter(
      (e) => brandIdByErrorId.get(e.error_id) === currModel.brand_id,
    )
    if (keptErrors.length === currErrors.length) return
    newAssetForm.setValue('errors', keptErrors, { shouldDirty: true, shouldValidate: true })
  }

  function closeModal() {
    onOpenChange(false)
  }

  async function printCreatedAssetBarcode(barcode: string) {
    try {
      await printBarcodes([barcode])
    } catch {
      toast.error('Failed to print barcode', { position: 'top-center' })
    }
  }

  // The acknowledgment is passed in by whichever path reached the save, so it can never be a
  // stale flag left over from an earlier attempt.
  async function onValidAsset(rawAsset: AssetForm, duplicateSerialAcknowledged: boolean) {
    // Fields hidden for this asset type are left null by validation; coerce every
    // numeric spec to a non-null number for the CreateAsset contract (0 for
    // non-applicable), and drop the internal finisher when it doesn't apply.
    const visibilityForAsset = getSpecificationFieldVisibility(rawAsset.model?.asset_type ?? null)
    const asset: AssetForm = {
      ...rawAsset,
      duplicateSerialAcknowledged,
      meterBlack: rawAsset.meterBlack ?? 0,
      meterColour: rawAsset.meterColour ?? 0,
      cassettes: rawAsset.cassettes ?? 0,
      component: visibilityForAsset.internalFinisher ? rawAsset.component : null,
      coreFunctions: visibilityForAsset.coreFunctions ? rawAsset.coreFunctions : [],
      drumLifeC: rawAsset.drumLifeC ?? 0,
      drumLifeM: rawAsset.drumLifeM ?? 0,
      drumLifeY: rawAsset.drumLifeY ?? 0,
      drumLifeK: rawAsset.drumLifeK ?? 0,
      tonerLifeC: rawAsset.tonerLifeC ?? 0,
      tonerLifeM: rawAsset.tonerLifeM ?? 0,
      tonerLifeY: rawAsset.tonerLifeY ?? 0,
      tonerLifeK: rawAsset.tonerLifeK ?? 0,
      damageNotes: rawAsset.isDamaged ? rawAsset.damageNotes : null,
    }
    if (isEditMode && onUpdateAsset) {
      setIsSubmitting(true)
      try {
        await onUpdateAsset(asset)
        newAssetForm.reset(asset, DISCARD_USER_EDITS)
        closeModal()
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    if (isEditMode) {
      updateAsset!(editingIndex!, asset)
      newAssetForm.reset(asset, DISCARD_USER_EDITS)
      closeModal()
      return
    }
    if (onCreateAsset) {
      setIsSubmitting(true)
      try {
        const created = await onCreateAsset(asset)
        newAssetForm.reset(getDefaultNewAsset(readinesses), DISCARD_USER_EDITS)
        closeModal()
        void printCreatedAssetBarcode(created.barcode)
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    addNewAsset!(asset)
    newAssetForm.reset(getDefaultNewAsset(readinesses), DISCARD_USER_EDITS)
    closeModal()
  }

  // Validation runs first, so field errors surface before the duplicate prompt and the prompt
  // only ever appears on a payload that is ready to save. Nothing is acknowledged in advance:
  // every save attempt on a matching serial goes back through the confirmation.
  function submitAsset() {
    newAssetForm.handleSubmit((asset) => {
      if (serialCheck.hasMatch) {
        setDuplicateConfirmOpen(true)
        return
      }
      return onValidAsset(asset, false)
    })()
  }

  function confirmDuplicateSerial() {
    setDuplicateConfirmOpen(false)
    newAssetForm.handleSubmit((asset) => onValidAsset(asset, true))()
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
                onSelectionChange={handleModelSelected}
              />
            </HorizontalField>
            <HorizontalField label="Serial Number" required>
              <div className="flex flex-col gap-2">
                <ControlledTextInput
                  control={newAssetForm.control}
                  name="serialNumber"
                  className={INPUT_WIDTH}
                />
                <DuplicateSerialWarning check={serialCheck} />
              </div>
            </HorizontalField>
          </div>

          <TechnicalSpecsFields
            control={newAssetForm.control}
            isColour={isColourModel}
            brandId={currBrandId}
            visibility={visibility}
            onReadinessChange={handleReadinessSelected}
            renderAfterReadiness={
              <HorizontalField label="Errors" required={isHasErrors}>
                <Controller
                  control={newAssetForm.control}
                  name="errors"
                  render={({ field, fieldState }) => (
                    <AssetErrorsEditor
                      value={field.value}
                      onChange={field.onChange}
                      brandId={currBrandId}
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
          <Button
            onClick={submitAsset}
            type="button"
            disabled={isSubmitting || serialCheck.isChecking || serialCheck.isBlocked}
          >
            {isSubmitting ? 'Saving…' : modalConfig.submitLabel}
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
