import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useOrgs } from '@/hooks/use-org'
import type { ArrivalMetadataForm } from '@/ui-types/arrival-form-types'
import { Controller, type Control } from 'react-hook-form'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { SelectOptions } from '../shared/search-select/select-options'

export function ArrivalMetadataFields({
  control,
}: {
  control: Control<ArrivalMetadataForm>
}): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgs()

  return (
    <>
      <ControlledSearchSelectInput
        control={control}
        name="vendor"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel="Vendor"
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
      <Controller
        control={control}
        name="warehouse"
        render={({ field: { onChange, value }, fieldState }) => (
          <SelectOptions
            selection={value}
            onSelectionChange={onChange}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={false}
            fieldRequired={true}
            error={fieldState.invalid}
          />
        )}
      />
    </>
  )
}
