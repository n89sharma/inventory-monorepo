import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useModelStore } from '@/data/store/model-store'
import { modelLabel } from '@/lib/reference-labels'
import type { ModelSummary } from 'shared-types'

export function ModelFilter({
  selection,
  query,
  onSelectionChange,
  onQueryChange,
  onClear,
  placeholder = 'Model',
}: {
  selection: ModelSummary | null
  query: string
  onSelectionChange: (model: ModelSummary) => void
  onQueryChange: (text: string) => void
  onClear: () => void
  placeholder?: string
}): React.JSX.Element {
  const models = useModelStore((state) => state.models)
  return (
    <SearchSelectInput
      selection={selection}
      query={query}
      onSelectionChange={onSelectionChange}
      onQueryChange={onQueryChange}
      onClear={onClear}
      options={models}
      getLabel={modelLabel}
      placeholder={placeholder}
      clearLabel="Clear model"
      className="w-35"
    />
  )
}
