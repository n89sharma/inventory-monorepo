import { useActiveUsers } from '@/hooks/use-active-users'
import { useOrgs } from '@/hooks/use-org'
import type { HoldMetadataForm } from '@/ui-types/hold-form-types'
import type { Control } from 'react-hook-form'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { ControlledSelectOptionSearchSelect } from '../shared/search-select/controlled-select-option-search-select'

export function HoldMetadataFields({
  control,
}: {
  control: Control<HoldMetadataForm>
}): React.JSX.Element {
  const activeUsers = useActiveUsers()
  const orgs = useOrgs()

  return (
    <>
      <ControlledSelectOptionSearchSelect
        control={control}
        name="created_for"
        options={activeUsers}
        getLabel={(u) => u.name}
        fieldLabel="Created For"
        fieldRequired={true}
      />
      <ControlledSearchSelectInput
        control={control}
        name="customer"
        options={orgs}
        getLabel={(o) => o.name}
        fieldLabel="Customer"
        fieldRequired={true}
      />
    </>
  )
}
