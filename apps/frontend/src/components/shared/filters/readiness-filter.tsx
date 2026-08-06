import { MultiSelectOptionsInline } from '@/components/shared/search-select/multi-select-options'
import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import { useReadinesses } from '@/hooks/use-reference-data'
import type { Status } from 'shared-types'

export function ReadinessFilter({
  selection,
  onSelectionChange,
}: {
  selection: Status[]
  onSelectionChange: (readinesses: Status[]) => void
}): React.JSX.Element {
  const readinesses = useReadinesses()
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
