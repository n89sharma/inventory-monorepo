import { useState } from 'react'
import {
  useController,
  useFormState,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { Field, FieldLabel } from '../shadcn/field'
import { SearchSelectInput } from './search-select-input'

type ControlledSearchSelectInputProps<T, TForm extends FieldValues> = {
  control: Control<TForm>
  name: Path<TForm>
  options: T[]
  getLabel: (i: T) => string
  fieldLabel: string
  fieldRequired: boolean
  className?: string
}

export function ControlledSearchSelectInput<T, TForm extends FieldValues>({
  control,
  name,
  options,
  getLabel,
  fieldLabel,
  fieldRequired,
  className,
}: ControlledSearchSelectInputProps<T, TForm>): React.JSX.Element {
  const { field } = useController({ control, name })
  const { errors } = useFormState({ control, name })
  const error = !!errors[name]
  const [query, setQuery] = useState('')

  return (
    <Field data-invalid={error} className={className}>
      <FieldLabel>
        {fieldLabel}
        {fieldRequired && <span className="text-destructive">*</span>}
      </FieldLabel>
      <SearchSelectInput
        selection={field.value as T | null}
        query={query}
        onSelectionChange={(val) => {
          field.onChange(val)
          setQuery('')
        }}
        onQueryChange={setQuery}
        onClear={() => {
          field.onChange(null)
          setQuery('')
        }}
        options={options}
        getLabel={getLabel}
        placeholder=""
        clearLabel={`Clear ${fieldLabel.toLowerCase()}`}
        error={error}
      />
    </Field>
  )
}
