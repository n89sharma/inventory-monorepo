import { ControlledInputWithClear } from '@/components/settings/controlled-input-with-clear'
import type { OrgForm } from '@/ui-types/org-form-types'
import type { Control } from 'react-hook-form'
import { FieldGroup } from '../shadcn/field'

export function OrgFormFields({ control }: { control: Control<OrgForm> }): React.JSX.Element {
  return (
    <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
      <ControlledInputWithClear
        control={control}
        name="account_number"
        fieldLabel="Account Number"
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="name"
        fieldLabel="Name"
        fieldRequired={true}
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="contact_name"
        fieldLabel="Contact Name"
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="phone"
        fieldLabel="Phone"
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="mobile"
        fieldLabel="Mobile"
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="primary_email"
        fieldLabel="Email"
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="address"
        fieldLabel="Address"
        inputType="string"
        className="col-span-2"
      />

      <ControlledInputWithClear
        control={control}
        name="city"
        fieldLabel="City"
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="province"
        fieldLabel="Province"
        inputType="string"
      />

      <ControlledInputWithClear
        control={control}
        name="country"
        fieldLabel="Country"
        inputType="string"
      />
    </FieldGroup>
  )
}
