import { useConstantsStore } from '@/data/store/constants-store'
import { useModelStore } from '@/data/store/model-store'
import { AssetFormSchema, type ArrivalForm, type AssetForm } from 'shared-types'
import type { Model } from 'shared-types'
import type { CoreFunction } from 'shared-types'
import { UNSELECTED } from 'shared-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm, type UseFieldArrayAppend, type UseFieldArrayUpdate } from 'react-hook-form'
import { ControlledInputWithClear } from '../custom/controlled-input-with-clear'
import { ControlledPopoverSearch } from '../custom/controlled-popover-search'
import { SelectOptions } from '../custom/select-options'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import MultipleSelector from '../shadcn/multiple-selector'

interface AssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addNewAsset: UseFieldArrayAppend<ArrivalForm, 'assets'>
  updateAsset: UseFieldArrayUpdate<ArrivalForm, 'assets'>
  editingAsset: AssetForm | null
  editingIndex: number | null
}

export function AssetModal({ open, onOpenChange, addNewAsset, updateAsset, editingAsset, editingIndex }: AssetModalProps): React.JSX.Element {
  const isEditMode = editingAsset !== null

  const modalConfig = {
    title: isEditMode ? 'Edit Asset' : 'Create Asset',
    submitLabel: isEditMode ? 'Update Asset' : 'Save Asset',
    clearLabel: isEditMode ? 'Reset' : 'Clear',
  }

  const newAssetForm = useForm<AssetForm>({
    resolver: zodResolver(AssetFormSchema),
    defaultValues: getDefaultNewAsset()
  })
  const technicalStatuses = useConstantsStore(state => state.technicalStatuses)
  const coreFunctions = useConstantsStore(state => state.coreFunctions)
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
      technicalStatus: UNSELECTED,
      meterBlack: null,
      meterColour: null,
      cassettes: null,
      internalFinisher: '',
      coreFunctions: []
    }
  }

  function clearOrReset() {
    if (isEditMode) {
      newAssetForm.reset(editingAsset!)
    } else {
      newAssetForm.reset(getDefaultNewAsset())
    }
  }

  function onValidAsset(asset: AssetForm) {
    if (isEditMode) {
      updateAsset(editingIndex!, asset)
    } else {
      addNewAsset(asset)
      newAssetForm.reset(getDefaultNewAsset())
    }
    onOpenChange(false)
  }

  function submitAsset() {
    newAssetForm.handleSubmit(onValidAsset)()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              getLabel={(m: Model) => `${m.brand_name} ${m.model_name}`}
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
              name='technicalStatus'
              render={({ field: { onChange, value: technicalStatus }, fieldState }) => (
                <SelectOptions
                  selection={technicalStatus}
                  onSelectionChange={onChange}
                  options={technicalStatuses}
                  getLabel={t => t.status}
                  fieldLabel='Testing Status'
                  fieldRequired={true}
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
                    placeholder='Select functions'
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
          <Button variant='secondary' onClick={submitAsset} type='button'>
            {modalConfig.submitLabel}
          </Button>
          <Button variant='outline' onClick={clearOrReset} type='button'>
            {modalConfig.clearLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
