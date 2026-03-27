import { useController, useFormState, type Control, type FieldValues, type Path } from "react-hook-form"
import { PopoverSearch } from "./popover-search"

type ControlledPopoverSearchProps<T, TForm extends FieldValues> = {
  control: Control<TForm>
  name: Path<TForm>
  options: T[]
  searchKey: string
  getLabel: (i: T) => string
  fieldLabel: string
  fieldRequired: boolean
  className?: string
}

export function ControlledPopoverSearch<T, TForm extends FieldValues>({
  control,
  name,
  ...props
}: ControlledPopoverSearchProps<T, TForm>): React.JSX.Element {

  const { field } = useController({ control, name })
  const { errors } = useFormState({ control, name })
  const error = !!errors[name]

  return (
    <PopoverSearch
      selection={field.value}
      onSelectionChange={val => field.onChange(val)}
      onClear={() => field.onChange(null)}
      error={error}
      {...props}
    />
  )

}