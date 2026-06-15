import { SearchSelectInput } from '@/components/custom/search-select-input'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useState } from 'react'
import type { Brand } from 'shared-types'

export function BrandFilter({
  selection,
  onSelectionChange,
  onClear,
}: {
  selection: Brand | null
  onSelectionChange: (brand: Brand) => void
  onClear: () => void
}): React.JSX.Element {
  const allBrands = useReferenceDataStore(state => state.brands)
  const [query, setQuery] = useState('')

  return (
    <SearchSelectInput
      selection={selection}
      query={query}
      onSelectionChange={b => {
        setQuery('')
        onSelectionChange(b)
      }}
      onQueryChange={setQuery}
      onClear={() => {
        setQuery('')
        onClear()
      }}
      options={allBrands}
      searchKey='name'
      getLabel={b => b.name}
      placeholder='Brand'
      clearLabel='Clear brand'
      className='w-35'
    />
  )
}
