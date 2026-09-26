import { MultiSearchSelectInput } from '@/components/shared/search-select/multi-search-select-input'
import { useModels } from '@/hooks/use-model'
import { modelLabel } from '@/lib/reference-labels'
import { MAX_MODEL_FILTER_COUNT, type ModelSummary } from 'shared-types'

const MODELS_LABEL = 'Models'

export function ModelsFilter({
  selection,
  query,
  onSelectionChange,
  onQueryChange,
  onClear,
  placeholder = 'Model',
}: {
  selection: ModelSummary[]
  query: string
  onSelectionChange: (models: ModelSummary[]) => void
  onQueryChange: (text: string) => void
  onClear: () => void
  placeholder?: string
}): React.JSX.Element {
  const models = useModels()
  return (
    <MultiSearchSelectInput
      selection={selection}
      query={query}
      onSelectionChange={onSelectionChange}
      onQueryChange={onQueryChange}
      onClear={onClear}
      options={models}
      getLabel={(m) => m.model_name}
      getColumns={(m) => [m.model_name, m.brand_name]}
      getSearchText={modelLabel}
      placeholder={placeholder}
      pluralLabel={MODELS_LABEL}
      maxSelection={MAX_MODEL_FILTER_COUNT}
      clearLabel="Clear models"
      className="w-36"
    />
  )
}
