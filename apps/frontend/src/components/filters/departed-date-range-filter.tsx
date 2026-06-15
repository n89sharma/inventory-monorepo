import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { SOLD_RANGE_MONTHS, type SoldRangeMonths } from '@/lib/search-sold-params'

const RANGE_LABELS = {
  1: 'Last month',
  6: 'Last 6 months',
} as const satisfies Record<SoldRangeMonths, string>

export function DepartedDateRangeFilter({
  value,
  onValueChange,
}: {
  value: SoldRangeMonths
  onValueChange: (range: SoldRangeMonths) => void
}): React.JSX.Element {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={String(value)}
      onValueChange={v => {
        if (v === '') return
        onValueChange(Number.parseInt(v, 10) as SoldRangeMonths)
      }}
      aria-label="Departed within"
    >
      {SOLD_RANGE_MONTHS.map(range => (
        <ToggleGroupItem key={range} value={String(range)}>
          {RANGE_LABELS[range]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
