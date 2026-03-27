import { Calendar } from "@/components/shadcn/calendar"
import { Field, FieldLabel } from "@/components/shadcn/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover"
import { Button } from "@/components/shadcn/button"
import { format } from "date-fns"
import { getSelectedOrNull, getSelectOption, isSelected, UNSELECTED, type SelectOption } from "shared-types"

interface DatePickerFieldProps {
  label: string
  date: SelectOption<Date>
  setDate: (date: SelectOption<Date>) => void
  id: string
  className?: string
}

export function DatePickerField({ label, date, setDate, id, className }: DatePickerFieldProps): React.JSX.Element {
  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="justify-start text-muted-foreground text-xs rounded-md"
          >
            {isSelected(date) ? format(date.selected, "PPP") : <span>Select</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-1" align="start">
          <Calendar
            mode="single"
            selected={getSelectedOrNull(date)}
            onSelect={d => d ? setDate(getSelectOption(d)) : setDate(UNSELECTED)}
            defaultMonth={getSelectedOrNull(date)}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
