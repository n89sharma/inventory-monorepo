import { Input } from '@/components/shadcn/input'
import { CircleNotchIcon } from '@phosphor-icons/react'

const PLACEHOLDER = '0.00'
const PREFIX_CLASS =
  'text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm'
const SPINNER_CLASS =
  'text-muted-foreground pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 animate-spin'

// Keeps digits and a single decimal point, so a half-typed value like "500." survives.
function sanitizePriceInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

interface PriceInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  invalid?: boolean
  saving?: boolean
  label?: string
  className?: string
}

export function PriceInput({
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  invalid,
  saving,
  label,
  className,
}: PriceInputProps): React.JSX.Element {
  return (
    <div className={`relative ${className ?? ''}`}>
      <span className={PREFIX_CLASS}>$</span>
      <Input
        value={value}
        onChange={(event) => onChange(sanitizePriceInput(event.target.value))}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        inputMode="decimal"
        placeholder={PLACEHOLDER}
        aria-label={label}
        aria-invalid={invalid}
        className="pl-6 tabular-nums"
      />
      {saving && <CircleNotchIcon className={SPINNER_CLASS} aria-hidden="true" />}
    </div>
  )
}
