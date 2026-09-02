import { ControlledInputWithClear } from '@/components/settings/controlled-input-with-clear'
import { useAssetTypes, useBrands } from '@/hooks/use-reference-data'
import type { ModelForm } from '@/ui-types/model-form-types'
import { Controller, type Control } from 'react-hook-form'
import type { AssetType, Brand } from 'shared-types'
import { Checkbox } from '../shadcn/checkbox'
import { FieldGroup } from '../shadcn/field'
import { Label } from '../shadcn/label'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { SelectOptions } from '../shared/search-select/select-options'

export function ModelFormFields({ control }: { control: Control<ModelForm> }): React.JSX.Element {
  const brands = useBrands()
  const assetTypes = useAssetTypes()

  return (
    <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
      <ControlledSearchSelectInput
        control={control}
        name="brand"
        options={brands}
        getLabel={(b: Brand) => b.name}
        fieldLabel="Brand"
        fieldRequired={true}
      />

      <ControlledInputWithClear
        control={control}
        name="name"
        fieldLabel="Name"
        fieldRequired={true}
        inputType="string"
      />

      <Controller
        control={control}
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
        control={control}
        name="weight"
        fieldLabel="Weight"
        fieldRequired={true}
        inputType="number"
      />

      <ControlledInputWithClear
        control={control}
        name="size"
        fieldLabel="Size"
        fieldRequired={true}
        inputType="number"
      />

      <Controller
        control={control}
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
  )
}
