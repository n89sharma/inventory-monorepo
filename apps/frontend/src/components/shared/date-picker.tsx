import { Button } from '@/components/shadcn/button'
import { Calendar } from '@/components/shadcn/calendar'
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import {
  getSelectedOrNull,
  getSelectOption,
  isSelected,
  UNSELECTED,
  type SelectOption,
} from '@/ui-types/select-option-types'
import { formatDate } from '@/lib/formatters'
import { useState } from 'react'
import type { Matcher } from 'react-day-picker'
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form'

interface DatePickerFieldProps {
  label: string
  date: SelectOption<Date>
  setDate: (date: SelectOption<Date>) => void
  id: string
  className?: string
  disabled?: Matcher | Matcher[]
  // Disables the trigger button itself, so the field is fully locked rather than just showing
  // an unselectable calendar — for a value that's read-only in the current context.
  fieldDisabled?: boolean
  startMonth?: Date
  endMonth?: Date
}

interface DatePickerPopoverProps extends Omit<DatePickerFieldProps, 'label'> {
  triggerText: string
  invalid?: boolean
}

function DatePickerPopover({
  triggerText,
  date,
  setDate,
  id,
  className,
  disabled,
  fieldDisabled,
  startMonth,
  endMonth,
  invalid,
}: DatePickerPopoverProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open && !fieldDisabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id={id}
          disabled={fieldDisabled}
          aria-invalid={invalid || undefined}
          className={`justify-start font-normal gap-2 ${className ?? ''}`}
        >
          {triggerText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1" align="start">
        <Calendar
          mode="single"
          required
          selected={getSelectedOrNull(date) ?? undefined}
          onSelect={(d) => {
            setDate(getSelectOption(d))
            setOpen(false)
          }}
          defaultMonth={getSelectedOrNull(date) ?? undefined}
          disabled={disabled}
          startMonth={startMonth}
          endMonth={endMonth}
        />
      </PopoverContent>
    </Popover>
  )
}

function DatePickerFieldInline({
  label,
  ...props
}: DatePickerFieldProps): React.JSX.Element {
  const triggerText = isSelected(props.date)
    ? `${label}: ${formatDate(props.date.selected)}`
    : label
  return <DatePickerPopover {...props} triggerText={triggerText} />
}

interface ControlledDatePickerFieldProps<TForm extends FieldValues> {
  control: Control<TForm>
  name: Path<TForm>
  label: string
  className?: string
  disabled?: Matcher | Matcher[]
  fieldDisabled?: boolean
  startMonth?: Date
  endMonth?: Date
}

export function ControlledDatePickerField<TForm extends FieldValues>({
  control,
  name,
  label,
  className,
  disabled,
  fieldDisabled,
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
        fieldDisabled={fieldDisabled}
        startMonth={startMonth}
        endMonth={endMonth}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )
}

interface ControlledLabelledDatePickerFieldProps<TForm extends FieldValues> {
  control: Control<TForm>
  name: Path<TForm>
  label: string
  fieldRequired: boolean
  className?: string
}

export function ControlledLabelledDatePickerField<TForm extends FieldValues>({
  control,
  name,
  label,
  fieldRequired,
  className,
}: ControlledLabelledDatePickerFieldProps<TForm>): React.JSX.Element {
  const { field, fieldState } = useController({ control, name })
  const value = field.value as Date | null
  return (
    <Field data-invalid={fieldState.invalid} className={className}>
      <FieldLabel htmlFor={name}>
        {label}
        {fieldRequired && <span className="text-destructive">*</span>}
      </FieldLabel>
      <DatePickerPopover
        id={name}
        triggerText={value ? formatDate(value) : ''}
        date={value ? getSelectOption(value) : UNSELECTED}
        setDate={(d) => field.onChange(getSelectedOrNull(d))}
        invalid={fieldState.invalid}
      />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )
}
