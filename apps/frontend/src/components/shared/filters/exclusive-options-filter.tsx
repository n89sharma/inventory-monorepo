import { Toggle } from '@/components/shadcn/toggle'

const EMPTY_SELECTION: never[] = []

export function ExclusiveOptionsFilter<T extends { id: number }>({
  options,
  selection,
  onSelectionChange,
  getLabel,
  allLabel,
  groupLabel,
  getOptionAriaLabel,
  allAriaLabel,
}: {
  options: T[]
  selection: T[]
  onSelectionChange: (next: T[]) => void
  getLabel: (option: T) => string
  allLabel: string
  groupLabel: string
  getOptionAriaLabel?: (option: T) => string
  allAriaLabel?: string
}): React.JSX.Element {
  const isAll = selection.length === 0
  const isOnly = (option: T) => selection.length === 1 && selection[0].id === option.id

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={groupLabel}>
      <Toggle
        variant="outline"
        pressed={isAll}
        onPressedChange={() => onSelectionChange(EMPTY_SELECTION)}
        aria-label={allAriaLabel ?? allLabel}
      >
        {allLabel}
      </Toggle>
      {options.map((option) => (
        <Toggle
          key={option.id}
          variant="outline"
          pressed={isOnly(option)}
          onPressedChange={(pressed) => onSelectionChange(pressed ? [option] : EMPTY_SELECTION)}
          aria-label={getOptionAriaLabel?.(option) ?? getLabel(option)}
        >
          {getLabel(option)}
        </Toggle>
      ))}
    </div>
  )
}
