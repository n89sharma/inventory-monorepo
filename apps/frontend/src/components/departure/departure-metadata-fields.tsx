import { useActiveUsers } from '@/hooks/use-active-users'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useOrgs } from '@/hooks/use-org'
import type { DepartureMetadataForm } from '@/ui-types/departure-form-types'
import { Controller, type Control } from 'react-hook-form'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { ControlledSelectOptionSearchSelect } from '../shared/search-select/controlled-select-option-search-select'
import { SelectOptions } from '../shared/search-select/select-options'

export function DepartureMetadataFields({
  control,
}: {
  control: Control<DepartureMetadataForm>
}): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()
  const activeUsers = useActiveUsers()
  const orgs = useOrgs()

  return (
    <>
      <Controller
        control={control}
        name="origin"
        render={({ field: { onChange, value }, fieldState }) => (
          <SelectOptions
            selection={value}
            onSelectionChange={onChange}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Origin"
            anyAllowed={false}
            fieldRequired={true}
            error={fieldState.invalid}
          />
        )}
      />
      <ControlledSearchSelectInput
        control={control}
        name="customer"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel="Customer"
        fieldRequired={true}
      />
      <ControlledSearchSelectInput
        control={control}
        name="transporter"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel="Transporter"
        fieldRequired={true}
      />
      <ControlledSelectOptionSearchSelect
        control={control}
        name="salesperson"
        options={activeUsers}
        getLabel={(u) => u.name}
        fieldLabel="Salesperson"
        fieldRequired={true}
      />
    </>
  )
}
