import { ControlledInputWithClear } from '@/components/settings/controlled-input-with-clear'
import { useBrands } from '@/hooks/use-reference-data'
import type { ComponentForm } from '@/ui-types/component-form-types'
import { Controller, type Control } from 'react-hook-form'
import type { Brand } from 'shared-types'
import { Checkbox } from '../shadcn/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../shadcn/field'
import { Input } from '../shadcn/input'
import { Label } from '../shadcn/label'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'

type ComponentFormControl = { control: Control<ComponentForm> }

export function ComponentFormFields({
  control,
  children,
}: ComponentFormControl & { children: React.ReactNode }): React.JSX.Element {
  return (
    <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
      {children}

      <ControlledInputWithClear
        control={control}
        name="name"
        fieldLabel="Name"
        fieldRequired={true}
        inputType="string"
      />

      <Controller
        control={control}
        name="is_active"
        render={({ field: { onChange, value } }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={value}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        )}
      />
    </FieldGroup>
  )
}

export function ComponentBrandSelect({ control }: ComponentFormControl): React.JSX.Element {
  const brands = useBrands()
  return (
    <ControlledSearchSelectInput
      control={control}
      name="brand"
      options={brands}
      getLabel={(b: Brand) => b.name}
      fieldLabel="Brand"
      fieldRequired={true}
    />
  )
}

export function LockedComponentBrand({
  brandName,
  reason,
}: {
  brandName: string
  reason: string
}): React.JSX.Element {
  return (
    <Field>
      <FieldLabel>Brand</FieldLabel>
      <Input value={brandName} disabled readOnly />
      <FieldDescription>{reason}</FieldDescription>
    </Field>
  )
}
