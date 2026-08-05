import { useState } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { SearchSelectInput } from './search-select-input'

/**
 * Bare react-hook-form binding for {@link SearchSelectInput}: no label of its
 * own, so it sits inside a `HorizontalField`/`FieldSet` that supplies the label.
 * Holds the transient typeahead text locally; commits only the selection to the
 * form. For the labelled variant use `ControlledSearchSelectInput`.
 */
type ControlledSearchSelectFieldProps<T, TForm extends FieldValues> = {
  control: Control<TForm>
  name: Path<TForm>
  options: T[]
  getLabel: (i: T) => string
  placeholder?: string
  clearLabel?: string
  className?: string
  // Runs after the pick is committed, for form state that follows the selection.
  // Clearing the field doesn't call it — only an actual selection does.
  onSelectionChange?: (selected: T) => void
}

export function ControlledSearchSelectField<T, TForm extends FieldValues>({
  control,
  name,
  options,
  getLabel,
  placeholder = '',
  clearLabel,
  className,
  onSelectionChange,
}: ControlledSearchSelectFieldProps<T, TForm>): React.JSX.Element {
  const [query, setQuery] = useState('')
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SearchSelectInput
          selection={field.value as T | null}
          query={query}
          onSelectionChange={(val) => {
            field.onChange(val)
            setQuery('')
            onSelectionChange?.(val)
          }}
          onQueryChange={setQuery}
          onClear={() => {
            field.onChange(null)
            setQuery('')
          }}
          options={options}
          getLabel={getLabel}
          placeholder={placeholder}
          clearLabel={clearLabel}
          error={fieldState.invalid}
          className={className}
        />
      )}
    />
  )
}
