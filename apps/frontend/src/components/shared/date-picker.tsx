import { Button } from '@/components/shadcn/button'
import { Calendar } from '@/components/shadcn/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import {
  getSelectedOrNull,
  getSelectOption,
  isSelected,
  UNSELECTED,
  type SelectOption,
} from '@/ui-types/select-option-types'
import { format } from 'date-fns'
import type { Matcher } from 'react-day-picker'

interface DatePickerFieldProps {
  label: string
  date: SelectOption<Date>
  setDate: (date: SelectOption<Date>) => void
  id: string
  className?: string
  disabled?: Matcher | Matcher[]
  startMonth?: Date
  endMonth?: Date
}

export function DatePickerFieldInline({
  label,
  date,
  setDate,
  id,
  className,
  disabled,
  startMonth,
  endMonth,
}: DatePickerFieldProps): React.JSX.Element {
  const triggerLabel = isSelected(date) ? `${label}: ${format(date.selected, 'PPP')}` : label
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id={id}
          className={`justify-start font-normal gap-2 ${className ?? ''}`}
        >
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1" align="start">
        <Calendar
          mode="single"
          selected={getSelectedOrNull(date) ?? undefined}
          onSelect={(d) => (d ? setDate(getSelectOption(d)) : setDate(UNSELECTED))}
          defaultMonth={getSelectedOrNull(date) ?? undefined}
          disabled={disabled}
          startMonth={startMonth}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  )
}
