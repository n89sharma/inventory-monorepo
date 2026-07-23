import { Button } from '@/components/shadcn/button'
import { Calendar } from '@/components/shadcn/calendar'
import { Field, FieldError } from '@/components/shadcn/field'
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
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'

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

interface ControlledDatePickerFieldProps<TForm extends FieldValues> {
  control: Control<TForm>
  name: Path<TForm>
  label: string
  className?: string
  disabled?: Matcher | Matcher[]
  startMonth?: Date
  endMonth?: Date
}

export function ControlledDatePickerField<TForm extends FieldValues>({
  control,
  name,
  label,
  className,
  disabled,
  startMonth,
  endMonth,
}: ControlledDatePickerFieldProps<TForm>): React.JSX.Element {
  const { field, fieldState } = useController({ control, name })
  const value = field.value as Date | null

  return (
    <Field data-invalid={fieldState.invalid} className={className}>
      <DatePickerFieldInline
        id={name}
        label={label}
        date={value ? getSelectOption(value) : UNSELECTED}
        setDate={(d) => field.onChange(getSelectedOrNull(d))}
        disabled={disabled}
        startMonth={startMonth}
        endMonth={endMonth}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )
}
