import { useAssetTypes, useBrands } from '@/hooks/use-reference-data'
import { useModelMutations } from '@/hooks/use-model-mutations'
import { flattenFieldErrors } from '@/lib/utils'
import { ModelFormSchema, type ModelForm } from '@/ui-types/model-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import type { AssetType, Brand } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Checkbox } from '../shadcn/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { FieldGroup } from '../shadcn/field'
import { Label } from '../shadcn/label'
import { ControlledInputWithClear } from '@/components/settings/controlled-input-with-clear'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { SelectOptions } from '../shared/search-select/select-options'

interface CreateModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getDefaultValues(): ModelForm {
  return {
    name: '',
    weight: 0,
    size: 0,
    brand: null,
    assetType: UNSELECTED,
    is_colour: false,
  }
}

export function CreateModelModal({ open, onOpenChange }: CreateModelModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Model</DialogTitle>
        </DialogHeader>
        <CreateModelFormBody onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

function CreateModelFormBody({
  onOpenChange,
}: Pick<CreateModelModalProps, 'onOpenChange'>): React.JSX.Element {
  const brands = useBrands()
  const assetTypes = useAssetTypes()
  const { createModel } = useModelMutations()

  const form = useForm<ModelForm>({
    resolver: zodResolver(ModelFormSchema),
    defaultValues: getDefaultValues(),
  })

  async function onValidSubmit(data: ModelForm) {
    try {
      await createModel(data)
      toast.success('Model created')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ModelForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ControlledInputWithClear
            control={form.control}
            name="name"
            fieldLabel="Name"
            fieldRequired={true}
            inputType="string"
          />

          <ControlledSearchSelectInput
            control={form.control}
            name="brand"
            options={brands}
            getLabel={(b: Brand) => b.name}
            fieldLabel="Brand"
            fieldRequired={true}
          />

          <Controller
            control={form.control}
            name="assetType"
            render={({ field: { onChange, value }, fieldState }) => (
              <SelectOptions
                selection={value}
                onSelectionChange={onChange}
                options={assetTypes}
                getLabel={(a: AssetType) => a.asset_type}
                fieldLabel="Asset Type"
                fieldRequired={true}
                anyAllowed={false}
                error={fieldState.invalid}
              />
            )}
          />

          <ControlledInputWithClear
            control={form.control}
            name="weight"
            fieldLabel="Weight"
            fieldRequired={true}
            inputType="number"
          />

          <ControlledInputWithClear
            control={form.control}
            name="size"
            fieldLabel="Size"
            fieldRequired={true}
            inputType="number"
          />

          <Controller
            control={form.control}
            name="is_colour"
            render={({ field: { onChange, value } }) => (
              <div className="flex items-center gap-2 self-end pb-2">
                <Checkbox
                  id="is_colour"
                  checked={value}
                  onCheckedChange={(checked) => onChange(checked === true)}
                />
                <Label htmlFor="is_colour">Colour</Label>
              </div>
            )}
          />
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="secondary" onClick={submitForm} type="button">
          Save Model
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
