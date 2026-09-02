import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useOrgs } from '@/hooks/use-org'
import { useState } from 'react'
import type { OrgDetail } from 'shared-types'

export function OrganizationFilter({
  selection,
  onSelectionChange,
  onClear,
  placeholder,
  clearLabel,
}: {
  selection: OrgDetail | null
  onSelectionChange: (organization: OrgDetail) => void
  onClear: () => void
  placeholder: string
  clearLabel: string
}): React.JSX.Element {
  const allOrganizations = useOrgs()
  const [query, setQuery] = useState('')

  return (
    <SearchSelectInput
      selection={selection}
      query={query}
      onSelectionChange={(organization) => {
        setQuery('')
        onSelectionChange(organization)
      }}
      onQueryChange={setQuery}
      onClear={() => {
        setQuery('')
        onClear()
      }}
      options={allOrganizations}
      getLabel={(organization) => organization.name}
      placeholder={placeholder}
      clearLabel={clearLabel}
      className="w-35"
    />
  )
}
