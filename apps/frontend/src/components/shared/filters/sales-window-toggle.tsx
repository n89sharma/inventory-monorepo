import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { SALES_WINDOW_OPTIONS, type SalesWindowMonths } from '@/lib/filters/parsers'

export function SalesWindowToggle({
  months,
  onMonthsChange,
  getLabel,
}: {
  months: SalesWindowMonths
  onMonthsChange: (next: SalesWindowMonths) => void
  getLabel: (option: SalesWindowMonths) => string
}): React.JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={String(months)}
      onValueChange={(value) => {
        const next = SALES_WINDOW_OPTIONS.find((option) => String(option) === value)
        if (next !== undefined) onMonthsChange(next)
      }}
      aria-label="Sales window"
    >
      {SALES_WINDOW_OPTIONS.map((option) => (
        <ToggleGroupItem key={option} value={String(option)}>
          {getLabel(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
