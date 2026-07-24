import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { XIcon } from '@phosphor-icons/react'

const DEFAULT_PLACEHOLDER = 'Invoice number'
const DEFAULT_CLEAR_LABEL = 'Clear invoice number'

export function InvoiceReferenceFilter({
  value,
  onChange,
  onClear,
  placeholder = DEFAULT_PLACEHOLDER,
  clearLabel = DEFAULT_CLEAR_LABEL,
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
  clearLabel?: string
}): React.JSX.Element {
  return (
    <div className="relative w-35">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="bg-background pr-8"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={clearLabel}
          onClick={onClear}
          className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
