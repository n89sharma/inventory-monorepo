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

type InputWithClearBodyProps = Omit<InputWithClearProps, 'fieldLabel' | 'fieldRequired'> & {
  placeholder?: string
  header: React.ReactNode
}

function InputWithClearBody({
  inputType,
  value,
  onValueChange,
  error,
  className,
  placeholder,
  header,
}: InputWithClearBodyProps): React.JSX.Element {

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
      {header}
      <InputGroup>
        <InputGroupInput
          type={resolvedInputType}
          value={value ?? ''}
          onChange={e => onValueChange(coerce(e.target.value))}
          placeholder={placeholder}
          aria-invalid={error}
        >
        </InputGroupInput>

        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label="Clear"
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

export function InputWithClear({
  fieldLabel,
  fieldRequired,
  ...rest
}: InputWithClearProps): React.JSX.Element {
  return (
    <InputWithClearBody
      {...rest}
      header={
        <FieldLabel>
          {fieldLabel}
          {fieldRequired && <span className="text-destructive">*</span>}
        </FieldLabel>
      }
    />
  )
}

export function InputWithClearInline({
  fieldLabel,
  fieldRequired,
  ...rest
}: InputWithClearProps): React.JSX.Element {
  const placeholder = fieldRequired ? `${fieldLabel} *` : fieldLabel
  return (
    <InputWithClearBody
      {...rest}
      placeholder={placeholder}
      header={null}
    />
  )
}
