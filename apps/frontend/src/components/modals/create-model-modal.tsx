import { createModel, getModels } from '@/data/api/model-api'
import { useModelStore } from '@/data/store/model-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { flattenFieldErrors } from '@/lib/utils'
import { ModelFormSchema, type ModelForm } from '@/ui-types/model-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import type { AssetType, Brand } from 'shared-types'
import { toast } from 'sonner'
import { ControlledInputWithClear } from '../custom/controlled-input-with-clear'
import { ControlledPopoverSearch } from '../custom/controlled-popover-search'
import { SelectOptions } from '../custom/select-options'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { FieldGroup } from '../shadcn/field'

interface CreateModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateModelModal({ open, onOpenChange }: CreateModelModalProps): React.JSX.Element {
  const brands = useReferenceDataStore(state => state.brands)
  const assetTypes = useReferenceDataStore(state => state.assetTypes)
  const setModels = useModelStore(state => state.setModels)

  const form = useForm<ModelForm>({
    resolver: zodResolver(ModelFormSchema),
    defaultValues: getDefaultValues()
  })

  useEffect(() => {
    if (open) form.reset(getDefaultValues())
  }, [open])

  function getDefaultValues(): ModelForm {
    return {
      name: '',
      weight: 0,
      size: 0,
      brand: null,
      assetType: UNSELECTED
    }
  }

  async function onValidSubmit(data: ModelForm) {
    const result = await createModel(data)
    if (result.success) {
      getModels().then(setModels)
      toast.success('Model created')
      onOpenChange(false)
    } else {
      toast.error(result.error.summary, { position: 'top-center' })
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ModelForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create Model</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => e.preventDefault()}>
          <FieldGroup className='grid grid-cols-2 gap-x-6 gap-y-3'>

            <ControlledInputWithClear
              control={form.control}
              name='name'
              fieldLabel='Name'
              fieldRequired={true}
              inputType='string'
            />

            <ControlledPopoverSearch
              control={form.control}
              name='brand'
              options={brands}
              searchKey='name'
              getLabel={(b: Brand) => b.name}
              fieldLabel='Brand'
              fieldRequired={true}
            />

            <Controller
              control={form.control}
              name='assetType'
              render={({ field: { onChange, value }, fieldState }) => (
                <SelectOptions
                  selection={value}
                  onSelectionChange={onChange}
                  options={assetTypes}
                  getLabel={(a: AssetType) => a.asset_type}
                  fieldLabel='Asset Type'
                  fieldRequired={true}
                  anyAllowed={false}
                  error={fieldState.invalid}
                />
              )}
            />

            <ControlledInputWithClear
              control={form.control}
              name='weight'
              fieldLabel='Weight'
              fieldRequired={true}
              inputType='number'
            />

            <ControlledInputWithClear
              control={form.control}
              name='size'
              fieldLabel='Size'
              fieldRequired={true}
              inputType='number'
            />

          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant='secondary' onClick={submitForm} type='button'>
            Save Model
          </Button>
          <Button variant='outline' onClick={() => onOpenChange(false)} type='button'>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
