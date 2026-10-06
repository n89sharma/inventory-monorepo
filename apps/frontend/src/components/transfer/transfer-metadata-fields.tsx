import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useOrgs } from '@/hooks/use-org'
import type { TransferMetadataForm } from '@/ui-types/transfer-form-types'
import { Controller, type Control } from 'react-hook-form'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { SelectOptions } from '../shared/search-select/select-options'

export function TransferMetadataFields({
  control,
}: {
  control: Control<TransferMetadataForm>
}): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()
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
      <Controller
        control={control}
        name="destination"
        render={({ field: { onChange, value }, fieldState }) => (
          <SelectOptions
            selection={value}
            onSelectionChange={onChange}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Destination"
            anyAllowed={false}
            fieldRequired={true}
            error={fieldState.invalid}
          />
        )}
      />
      <ControlledSearchSelectInput
        control={control}
        name="transporter"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel="Transporter"
        fieldRequired={true}
      />
    </>
  )
}
