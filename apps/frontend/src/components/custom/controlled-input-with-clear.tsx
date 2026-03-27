import { useController, useFormState, type Control, type FieldValues, type Path } from "react-hook-form"
import { InputWithClear } from "./input-with-clear"

export type ControlledInputWithClearProps<TForm extends FieldValues> = {
  control: Control<TForm>
  name: Path<TForm>
  fieldLabel: string
  fieldRequired?: boolean
  className?: string
  inputType: 'string' | 'number'
}

export function ControlledInputWithClear<TForm extends FieldValues>({
  control,
  name,
  ...props
}: ControlledInputWithClearProps<TForm>): React.JSX.Element {

  const { field } = useController({ control, name })
  const { errors } = useFormState({ control, name })
  const error = !!errors[name]

  return (
    <InputWithClear
      value={field.value}
      onValueChange={val => field.onChange(val)}
      error={error}
      {...props}
    />
  )
}

