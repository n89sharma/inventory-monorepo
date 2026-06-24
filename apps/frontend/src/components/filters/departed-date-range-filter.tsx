import { DatePickerFieldInline } from '@/components/custom/date-picker'
import { getDepartedFloor, isValidSoldDateRange } from '@/lib/search-sold-params'
import { getSelectedOrNull, getSelectOption } from '@/ui-types/select-option-types'

const INVALID_RANGE_MESSAGE = 'Only data from the last 18 months can be shown'

export function DepartedDateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: Date
  to: Date
  onChange: (from: Date, to: Date) => void
}): React.JSX.Element {
  const floor = getDepartedFloor()
  const today = new Date()
  const valid = isValidSoldDateRange(from, to)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row gap-2">
        <DatePickerFieldInline
          label="From"
          id="departed-from"
          date={getSelectOption(from)}
          setDate={(d) => {
            const next = getSelectedOrNull(d)
            if (next) onChange(next, to)
          }}
          disabled={[{ before: floor }, { after: to }]}
          startMonth={floor}
          endMonth={today}
        />
        <DatePickerFieldInline
          label="To"
          id="departed-to"
          date={getSelectOption(to)}
          setDate={(d) => {
            const next = getSelectedOrNull(d)
            if (next) onChange(from, next)
          }}
          disabled={[{ before: from }, { after: today }]}
          startMonth={floor}
          endMonth={today}
        />
      </div>
      {valid ? null : <p className="text-destructive text-xs">{INVALID_RANGE_MESSAGE}</p>}
    </div>
  )
}
