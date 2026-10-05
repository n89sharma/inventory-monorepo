import { Button } from '@/components/shadcn/button'
import { Calendar } from '@/components/shadcn/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { formatDate } from '@/lib/formatters'
import { useState } from 'react'
import type { DateRange, Matcher } from 'react-day-picker'

const RANGE_SEPARATOR = ' – '
const EMPTY_RANGE_LABEL = 'Date range'
const MONTHS_SHOWN = 2

interface DateRangeFilterProps {
  id: string
  from: Date | null
  to: Date | null
  onChange: (from: Date, to: Date) => void
  label?: string
  disabled?: Matcher | Matcher[]
  startMonth?: Date
  endMonth?: Date
}

export function DateRangeFilter({
  id,
  from,
  to,
  onChange,
  label,
  disabled,
  startMonth,
  endMonth,
}: DateRangeFilterProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(undefined)

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) setDraft({ from: from ?? undefined, to: to ?? undefined })
    setOpen(newOpen)
  }

  function handleSelect(range: DateRange | undefined) {
    setDraft(range)
    if (range?.from === undefined || range.to === undefined) return
    onChange(range.from, range.to)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" id={id} className="justify-start font-normal gap-2">
          {triggerLabel(label, from, to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1" align="start">
        <Calendar
          mode="range"
          required
          resetOnSelect
          captionLayout="dropdown"
          numberOfMonths={MONTHS_SHOWN}
          selected={draft}
          onSelect={handleSelect}
          defaultMonth={from ?? undefined}
          disabled={disabled}
          startMonth={startMonth}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  )
}

function triggerLabel(label: string | undefined, from: Date | null, to: Date | null): string {
  let range = EMPTY_RANGE_LABEL
  if (from !== null && to !== null) range = `${formatDate(from)}${RANGE_SEPARATOR}${formatDate(to)}`
  if (label === undefined) return range
  return `${label}: ${range}`
}
