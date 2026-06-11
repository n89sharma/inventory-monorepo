import { ModelSearchInput } from '@/components/custom/model-search-input'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useState } from 'react'
import type { Component } from 'shared-types'

export function InternalFinisherFilter({
  selection,
  onSelectionChange,
  onClear,
}: {
  selection: Component | null
  onSelectionChange: (component: Component) => void
  onClear: () => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const allComponents = useReferenceDataStore(state => state.components)
  return (
    <ModelSearchInput
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
      options={allComponents}
      searchKey='name'
      getLabel={c => `${c.brand_name} — ${c.name}`}
      placeholder='Internal Finisher'
      clearLabel='Clear internal finisher'
      className='w-45'
    />
  )
}
