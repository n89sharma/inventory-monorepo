import { Input } from '@/components/shadcn/input'
import { sanitizeDecimalInput } from '@/lib/input-sanitizers'

const PLACEHOLDER = '0'
const SUFFIX_CLASS =
  'text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm'

interface PercentInputProps {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  label?: string
  className?: string
  autoFocus?: boolean
}

export function PercentInput({
  value,
  onChange,
  invalid,
  label,
  className,
  autoFocus,
}: PercentInputProps): React.JSX.Element {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Input
        value={value}
        onChange={(event) => onChange(sanitizeDecimalInput(event.target.value))}
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={PLACEHOLDER}
        aria-label={label}
        aria-invalid={invalid}
        className="h-7 pr-6 tabular-nums"
      />
      <span className={SUFFIX_CLASS}>%</span>
    </div>
  )
}
