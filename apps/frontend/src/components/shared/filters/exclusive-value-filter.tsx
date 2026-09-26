import { Toggle } from '@/components/shadcn/toggle'

export function ExclusiveValueFilter<T extends string>({
  values,
  labels,
  selection,
  onSelectionChange,
  allLabel,
  groupLabel,
}: {
  values: readonly T[]
  labels: Record<T, string>
  selection: T | null
  onSelectionChange: (next: T | null) => void
  allLabel: string
  groupLabel: string
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={groupLabel}>
      <Toggle
        variant="outline"
        pressed={selection === null}
        onPressedChange={() => onSelectionChange(null)}
      >
        {allLabel}
      </Toggle>
      {values.map((value) => (
        <Toggle
          key={value}
          variant="outline"
          pressed={selection === value}
          onPressedChange={(pressed) => onSelectionChange(pressed ? value : null)}
        >
          {labels[value]}
        </Toggle>
      ))}
    </div>
  )
}
