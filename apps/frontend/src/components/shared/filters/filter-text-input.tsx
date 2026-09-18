import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { XIcon } from '@phosphor-icons/react'

/**
 * Presentational text input for a table-toolbar filter: the placeholder doubles as the
 * accessible name, and a clear button appears once there is something to clear. The
 * binding to a column or to the table decides what an empty value means.
 */
export function FilterTextInput({
  value,
  onValueChange,
  placeholder,
  clearLabel,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  clearLabel: string
  className?: string
}): React.JSX.Element {
  return (
    <div className={`relative ${className ?? ''}`.trim()}>
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
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
          onClick={() => onValueChange('')}
          className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}
