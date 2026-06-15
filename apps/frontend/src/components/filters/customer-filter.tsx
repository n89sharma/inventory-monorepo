import { SearchSelectInput } from '@/components/custom/search-select-input'
import { useOrgStore } from '@/data/store/org-store'
import { useState } from 'react'
import type { OrgSummary } from 'shared-types'

export function CustomerFilter({
  selection,
  onSelectionChange,
  onClear,
}: {
  selection: OrgSummary | null
  onSelectionChange: (customer: OrgSummary) => void
  onClear: () => void
}): React.JSX.Element {
  const allCustomers = useOrgStore(state => state.organizations)
  const [query, setQuery] = useState('')

  return (
    <SearchSelectInput
      selection={selection}
      query={query}
      onSelectionChange={c => {
        setQuery('')
        onSelectionChange(c)
      }}
      onQueryChange={setQuery}
      onClear={() => {
        setQuery('')
        onClear()
      }}
      options={allCustomers}
      searchKey='name'
      getLabel={c => c.name}
      placeholder='Customer'
      clearLabel='Clear customer'
      className='w-45'
    />
  )
}
