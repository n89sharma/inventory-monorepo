import { HorizontalField } from '@/components/shared/horizontal-field'
import { PriceInput } from '@/components/shared/price-input'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'

const DEFAULT_INPUT_WIDTH = 'max-w-[160px]'

interface PriceFieldProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  className?: string
}

export function PriceField<T extends FieldValues>({
  control,
  name,
  label,
  className = DEFAULT_INPUT_WIDTH,
}: PriceFieldProps<T>): React.JSX.Element {
  return (
    <HorizontalField label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => (
          <PriceInput
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            invalid={fieldState.invalid}
            label={label}
            className={className}
          />
        )}
      />
    </HorizontalField>
  )
}
