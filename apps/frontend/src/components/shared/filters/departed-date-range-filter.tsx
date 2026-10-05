import { DateRangeFilter } from '@/components/shared/filters/date-range-filter'
import { getToday } from '@/lib/filters/defaults'
import { getDepartedFloor, isValidDepartedDateRange } from '@/lib/filters/hooks'
import { MAX_DEPARTED_WINDOW_MONTHS } from 'shared-types'

const INVALID_RANGE_MESSAGE = `Only data from the last ${MAX_DEPARTED_WINDOW_MONTHS} months can be shown`

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
  const today = getToday()
  const valid = isValidDepartedDateRange(from, to)

  return (
    <div className="flex flex-col gap-1">
      <DateRangeFilter
        id="departed-range"
        from={from}
        to={to}
        onChange={onChange}
        disabled={[{ before: floor }, { after: today }]}
        startMonth={floor}
        endMonth={today}
      />
      {valid ? null : <p className="text-destructive text-xs">{INVALID_RANGE_MESSAGE}</p>}
    </div>
  )
}
