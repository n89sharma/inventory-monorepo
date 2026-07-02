import { MultiSelectOptionsInline } from '@/components/shared/search-select/multi-select-options'
import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import type { Status } from 'shared-types'

export function ReadinessFilter({
  selection,
  onSelectionChange,
}: {
  selection: Status[]
  onSelectionChange: (readinesses: Status[]) => void
}): React.JSX.Element {
  const readinesses = useReferenceDataStore((state) => state.readinesses)
  return (
    <MultiSelectOptionsInline
      selection={selection}
      onSelectionChange={onSelectionChange}
      options={readinesses}
      getLabel={(s) => getReadinessDisplay(s.status)}
      fieldLabel="Readiness"
      className="w-35"
    />
  )
}
