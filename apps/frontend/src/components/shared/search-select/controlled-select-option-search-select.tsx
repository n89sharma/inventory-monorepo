import {
  getSelectOption,
  getSelectedOrNull,
  UNSELECTED,
  type SelectOption,
} from '@/ui-types/select-option-types'
import { useState } from 'react'
import {
  useController,
  useFormState,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { Field, FieldLabel } from '@/components/shadcn/field'
import { SearchSelectInput } from './search-select-input'

type ControlledSelectOptionSearchSelectProps<T, TForm extends FieldValues> = {
  control: Control<TForm>
  name: Path<TForm>
  options: T[]
  getLabel: (i: T) => string
  fieldLabel: string
  fieldRequired: boolean
  className?: string
}

export function ControlledSelectOptionSearchSelect<T, TForm extends FieldValues>({
  control,
  name,
  options,
  getLabel,
  fieldLabel,
  fieldRequired,
  className,
}: ControlledSelectOptionSearchSelectProps<T, TForm>): React.JSX.Element {
  const { field } = useController({ control, name })
  const { errors } = useFormState({ control, name })
  const error = !!errors[name]
  const [query, setQuery] = useState('')

  const selection = field.value as SelectOption<T>

  return (
    <Field data-invalid={error} className={className}>
      <FieldLabel>
        {fieldLabel}
        {fieldRequired && <span className="text-destructive">*</span>}
      </FieldLabel>
      <SearchSelectInput
        selection={getSelectedOrNull(selection)}
        query={query}
        onSelectionChange={(val) => {
          field.onChange(getSelectOption(val))
          setQuery('')
        }}
        onQueryChange={setQuery}
        onClear={() => {
          field.onChange(UNSELECTED)
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
