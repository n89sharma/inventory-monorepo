import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { cn } from '@/lib/utils'
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
  leadingIcon,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  clearLabel: string
  leadingIcon?: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={`relative ${className ?? ''}`.trim()}>
      {leadingIcon && (
        <span
          className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          {leadingIcon}
        </span>
      )}
      <Input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn('bg-background pr-8', leadingIcon && 'pl-8')}
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
