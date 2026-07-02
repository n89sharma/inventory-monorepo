import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useOrgStore } from '@/data/store/org-store'
import { useState } from 'react'
import type { OrgSummary } from 'shared-types'

const DEFAULT_PLACEHOLDER = 'Customer'
const DEFAULT_CLEAR_LABEL = 'Clear customer'

export function CustomerFilter({
  selection,
  onSelectionChange,
  onClear,
  placeholder = DEFAULT_PLACEHOLDER,
  clearLabel = DEFAULT_CLEAR_LABEL,
}: {
  selection: OrgSummary | null
  onSelectionChange: (customer: OrgSummary) => void
  onClear: () => void
  placeholder?: string
  clearLabel?: string
}): React.JSX.Element {
  const allCustomers = useOrgStore((state) => state.organizations)
  const [query, setQuery] = useState('')

  return (
    <SearchSelectInput
      selection={selection}
      query={query}
      onSelectionChange={(c) => {
        setQuery('')
        onSelectionChange(c)
      }}
      onQueryChange={setQuery}
      onClear={() => {
        setQuery('')
        onClear()
      }}
      options={allCustomers}
      getLabel={(c) => c.name}
      placeholder={placeholder}
      clearLabel={clearLabel}
      className="w-35"
    />
  )
}
