import { XIcon } from "@phosphor-icons/react"
import { Field, FieldLabel } from "../shadcn/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "../shadcn/input-group"

export type InputWithClearProps = {
  inputType: 'string' | 'number'
  value: string | number | null
  onValueChange: (val: string | number | null) => void
  fieldLabel: string
  fieldRequired?: boolean
  error?: boolean
  className?: string
}

export function InputWithClear({
  inputType,
  value,
  onValueChange,
  fieldLabel,
  fieldRequired,
  error,
  className }: InputWithClearProps): React.JSX.Element {

  const resolvedInputType = inputType ?? 'string'

  function coerce(raw: string): string | number | null {
    if (raw === '') return null
    if (resolvedInputType === 'number') {
      const parsed = Number(raw)
      return isNaN(parsed) ? null : parsed
    }
    return raw
  }

  function isValuePresent() {
    if (typeof value === 'string') return value.length > 0
    return !!value
  }

  return (
    <Field className={className} data-invalid={error}>
      <FieldLabel>
        {fieldLabel}
        {fieldRequired && <span className="text-destructive">*</span>}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          type={resolvedInputType}
          value={value ?? ''}
          onChange={e => onValueChange(coerce(e.target.value))}
          aria-invalid={error}
        >
        </InputGroupInput>

        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            onClick={() => onValueChange(null)}
            hidden={!isValuePresent()}
          >
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}
