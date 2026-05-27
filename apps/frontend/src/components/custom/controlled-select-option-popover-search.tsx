import { getSelectOption, getSelectedOrNull, UNSELECTED, type SelectOption } from "@/ui-types/select-option-types"
import { useController, useFormState, type Control, type FieldValues, type Path } from "react-hook-form"
import { PopoverSearch } from "./popover-search"

type ControlledSelectOptionPopoverSearchProps<T, TForm extends FieldValues> = {
  control: Control<TForm>
  name: Path<TForm>
  options: T[]
  searchKey: string
  getLabel: (i: T) => string
  fieldLabel: string
  fieldRequired: boolean
  className?: string
}

export function ControlledSelectOptionPopoverSearch<T, TForm extends FieldValues>({
  control,
  name,
  ...props
}: ControlledSelectOptionPopoverSearchProps<T, TForm>): React.JSX.Element {

  const { field } = useController({ control, name })
  const { errors } = useFormState({ control, name })
  const error = !!errors[name]

  const selection = field.value as SelectOption<T>

  return (
    <PopoverSearch
      selection={getSelectedOrNull(selection)}
      onSelectionChange={val => field.onChange(getSelectOption(val))}
      onClear={() => field.onChange(UNSELECTED)}
      error={error}
      {...props}
    />
  )

}
