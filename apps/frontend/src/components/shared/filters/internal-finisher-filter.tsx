import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { componentLabel } from '@/lib/reference-labels'
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
  const allComponents = useReferenceDataStore((state) => state.components)
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
      options={allComponents}
      getLabel={componentLabel}
      placeholder="Internal Finisher"
      clearLabel="Clear internal finisher"
      className="w-35"
    />
  )
}
