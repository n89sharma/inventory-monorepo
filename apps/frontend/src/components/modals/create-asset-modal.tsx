import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { AssetFormSchema, type ArrivalForm, type AssetForm } from '@/ui-types/arrival-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm, type UseFieldArrayAppend, type UseFieldArrayUpdate } from 'react-hook-form'
import type { CoreFunction, ModelSummary } from 'shared-types'
import { ControlledInputWithClear } from '../custom/controlled-input-with-clear'
import { ControlledPopoverSearch } from '../custom/controlled-popover-search'
import { SelectOptions } from '../custom/select-options'
import { UnsavedChangesDialog } from '../custom/unsaved-changes-dialog'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import MultipleSelector from '../shadcn/multiple-selector'

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

export function AssetModal({ open, onOpenChange, addNewAsset, updateAsset, editingAsset, editingIndex, onCreateAsset, onUpdateAsset }: AssetModalProps): React.JSX.Element {
  const isEditMode = editingAsset != null
  const [isSubmitting, setIsSubmitting] = useState(false)

  const modalConfig = {
    title: isEditMode ? 'Edit Asset' : 'Create Asset',
    submitLabel: isEditMode ? 'Update Asset' : 'Save Asset',
  }

  const newAssetForm = useForm<AssetForm>({
    resolver: zodResolver(AssetFormSchema),
    defaultValues: getDefaultNewAsset()
  })
  const isDirty = newAssetForm.formState.isDirty
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)
  const readinesses = useReferenceDataStore(state => state.readinesses)
  const coreFunctions = useReferenceDataStore(state => state.coreFunctions)
  const models = useModelStore(state => state.models)

  useEffect(() => {
    if (open && editingAsset) {
      newAssetForm.reset(editingAsset)
    } else if (open && !editingAsset) {
      newAssetForm.reset(getDefaultNewAsset())
    }
  }, [open, editingAsset])

  function getCoreFunctionOptions(cfs: CoreFunction[]) {
    return cfs.map(f => ({ id: f.id, label: f.accessory, value: f.accessory }))
  }

  function getDefaultNewAsset() {
    return {
      serialNumber: '',
      model: null,
      readiness: UNSELECTED,
      meterBlack: null,
      meterColour: null,
      cassettes: null,
      internalFinisher: '',
      coreFunctions: []
    }
  }

  async function onValidAsset(asset: AssetForm) {
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
        newAssetForm.reset(getDefaultNewAsset())
        onOpenChange(false)
      } catch {
        // interceptor already showed the error toast — keep modal open
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    addNewAsset!(asset)
    newAssetForm.reset(getDefaultNewAsset())
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
      <DialogContent className='sm:max-w-2xl overflow-y-auto max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle>{modalConfig.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => e.preventDefault()}>
          <FieldGroup className='grid grid-cols-2 gap-x-6 gap-y-3'>

            <ControlledPopoverSearch
              control={newAssetForm.control}
              name='model'
              options={models}
              searchKey='model_name'
              getLabel={(m: ModelSummary) => `${m.brand_name} ${m.model_name}`}
              fieldLabel='Model'
              fieldRequired={true}
            />

            <ControlledInputWithClear
              control={newAssetForm.control}
              name='serialNumber'
              fieldLabel='Serial Number'
              fieldRequired={true}
              inputType='string'
            />

            <ControlledInputWithClear
              control={newAssetForm.control}
              name='meterBlack'
              fieldLabel='Meter Black'
              fieldRequired={true}
              inputType='number'
            />

            <ControlledInputWithClear
              control={newAssetForm.control}
              name='meterColour'
              fieldLabel='Meter Colour'
              fieldRequired={true}
              inputType='number'
            />

            <Controller
              control={newAssetForm.control}
              name='readiness'
              render={({ field: { onChange, value: readiness }, fieldState }) => (
                <SelectOptions
                  selection={readiness}
                  onSelectionChange={onChange}
                  options={readinesses}
                  getLabel={t => t.status}
                  fieldLabel='Readiness'
                  fieldRequired={false}
                  error={fieldState.invalid}
                />
              )}
            />

            <ControlledInputWithClear
              control={newAssetForm.control}
              name='cassettes'
              fieldLabel='Cassettes'
              fieldRequired={true}
              inputType='number'
            />

            <ControlledInputWithClear
              control={newAssetForm.control}
              name='internalFinisher'
              fieldLabel='Internal Finisher'
              inputType='string'
            />

            <Field>
              <FieldLabel>Core Functions</FieldLabel>
              <Controller
                name='coreFunctions'
                control={newAssetForm.control}
                render={({ field: { onChange, value } }) => (
                  <MultipleSelector
                    options={getCoreFunctionOptions(coreFunctions)}
                    placeholder='Select functions…'
                    emptyIndicator={<p>No results found.</p>}
                    value={getCoreFunctionOptions(value)}
                    onChange={options => onChange(coreFunctions.filter(c => options.map(o => o.id).includes(c.id)))}
                  />
                )}
              />
            </Field>

          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)} type='button' disabled={isSubmitting}>
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
