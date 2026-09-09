import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip'
import { useErrorCodes } from '@/hooks/use-reference-data'
import { cn } from '@/lib/utils'
import { TrashIcon } from '@phosphor-icons/react'
import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { AssetError, Error as ReferenceErrorType, UpdateError } from 'shared-types'

// Descriptions run to 2400+ characters on some codes; the page shows a preview, the tooltip the rest.
const DESCRIPTION_CLAMP = 'line-clamp-3'

const NOOP_UNSUBSCRIBE = () => {}

/**
 * Props passed to the caller-supplied search input. These match
 * `SearchSelectInput`'s data props, so the caller spreads them on and adds only
 * presentation (placeholder, width). The selected error is appended to the list
 * below — the box itself never holds a selection, so `selection` is always null.
 */
type AssetErrorsSearchSlotProps = {
  selection: null
  query: string
  onQueryChange: (text: string) => void
  onSelectionChange: (e: ReferenceErrorType) => void
  onClear: () => void
  options: ReferenceErrorType[]
  getLabel: (e: ReferenceErrorType) => string
  error: boolean
}

interface AssetErrorsEditorProps {
  value: UpdateError[]
  onChange: (next: UpdateError[]) => void
  brandId: number | null
  disabled?: boolean
  invalid?: boolean
  statusToggleable?: boolean
  renderSearch: (props: AssetErrorsSearchSlotProps) => ReactNode
}

function ErrorStatusBadge({ isFixed, onToggle }: { isFixed: boolean; onToggle?: () => void }) {
  const variant = isFixed ? 'success' : 'destructive'
  const label = isFixed ? 'Fixed' : 'Open'
  if (!onToggle) return <Badge variant={variant}>{label}</Badge>
  return (
    <Badge asChild variant={variant}>
      <button
        type="button"
        onClick={onToggle}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        {label}
      </button>
    </Badge>
  )
}

type AssetErrorItemProps = React.ComponentProps<'div'> & {
  code: string
  description: string | null | undefined
  descriptionClassName?: string
  descriptionRef?: React.Ref<HTMLSpanElement>
}

function AssetErrorItem({
  code,
  description,
  descriptionClassName,
  descriptionRef,
  className,
  children,
  ...rest
}: AssetErrorItemProps) {
  return (
    <div
      className={cn('flex items-center border-b px-3 py-2 last:border-0 gap-2', className)}
      {...rest}
    >
      <div className="flex flex-1 flex-col min-w-0">
        <span className="font-medium break-words">{code}</span>
        {description && (
          <span
            ref={descriptionRef}
            className={cn('text-xs text-muted-foreground break-words', descriptionClassName)}
          >
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/**
 * Reports whether the observed element is actually cut off by its line clamp.
 * Re-measures on resize, since the Errors card is fluid and the same description
 * clamps at a narrow viewport but not a wide one.
 */
function useClampedOverflow() {
  const [element, setElement] = useState<HTMLSpanElement | null>(null)

  const subscribe = useCallback(
    (onSizeChange: () => void) => {
      if (!element) return NOOP_UNSUBSCRIBE
      const observer = new ResizeObserver(onSizeChange)
      observer.observe(element)
      return () => observer.disconnect()
    },
    [element],
  )

  const getSnapshot = useCallback(() => {
    if (!element) return false
    return element.scrollHeight > element.clientHeight
  }, [element])

  return { measureRef: setElement, clamped: useSyncExternalStore(subscribe, getSnapshot) }
}

function AssetErrorListItem({ error }: { error: AssetError }) {
  // Some codes carry an empty string rather than null, so a null check isn't enough.
  const description = error.description?.trim()
  const { measureRef, clamped } = useClampedOverflow()

  const row = (
    <AssetErrorItem
      code={error.code}
      description={description}
      descriptionClassName={DESCRIPTION_CLAMP}
      descriptionRef={measureRef}
      tabIndex={clamped ? 0 : undefined}
      className={clamped ? 'cursor-default' : undefined}
    >
      <div className="flex w-16 justify-center">
        <ErrorStatusBadge isFixed={error.is_fixed} />
      </div>
    </AssetErrorItem>
  )

  // Nothing is hidden unless the clamp actually bites, so there is nothing to reveal.
  if (!clamped) return row

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent align="start">{description}</TooltipContent>
    </Tooltip>
  )
}

/** Read-only counterpart to `AssetErrorsEditor`, sharing its row markup. */
export function AssetErrorsList({ errors }: { errors: AssetError[] }) {
  return (
    <div className="rounded-md border">
      {errors.map((e) => (
        <AssetErrorListItem key={e.error_id} error={e} />
      ))}
    </div>
  )
}

export function AssetErrorsEditor({
  value,
  onChange,
  brandId,
  disabled = false,
  invalid = false,
  statusToggleable = true,
  renderSearch,
}: AssetErrorsEditorProps) {
  const allErrors = useErrorCodes()
  const [query, setQuery] = useState('')

  const selectedIds = new Set(value.map((e) => e.error_id))
  // When no brand is known (no model picked yet), search across every brand's
  // errors rather than blocking the user. The backend re-checks brand/error
  // consistency on submit, so an off-brand pick gets surfaced as a toast.
  const availableErrors = allErrors.filter((e) => {
    const brandOk = brandId == null || e.brand_id === brandId
    return brandOk && !selectedIds.has(e.id)
  })
  const errorById = new Map(allErrors.map((e) => [e.id, e]))

  function handleSelect(error: ReferenceErrorType) {
    onChange([...value, { error_id: error.id, is_fixed: false }])
    setQuery('')
  }

  function handleToggleFixed(errorId: number) {
    onChange(value.map((e) => (e.error_id === errorId ? { ...e, is_fixed: !e.is_fixed } : e)))
  }

  function handleRemove(errorId: number) {
    onChange(value.filter((e) => e.error_id !== errorId))
  }

  const searchSlotProps: AssetErrorsSearchSlotProps = {
    selection: null,
    query,
    onQueryChange: setQuery,
    onSelectionChange: handleSelect,
    onClear: () => setQuery(''),
    options: availableErrors,
    getLabel: (e) => (e.description ? `${e.code} — ${e.description}` : e.code),
    error: invalid,
  }

  return (
    <div className={cn('flex flex-col gap-2', disabled && 'opacity-50 pointer-events-none')}>
      {renderSearch(searchSlotProps)}

      {value.length > 0 && (
        <div className="rounded-md border">
          {value.map((e) => {
            const ref = errorById.get(e.error_id)
            const code = ref?.code ?? `#${e.error_id}`
            const description = ref?.description
            return (
              <AssetErrorItem key={e.error_id} code={code} description={description}>
                <div className="flex w-16 justify-center">
                  <ErrorStatusBadge
                    isFixed={e.is_fixed}
                    onToggle={statusToggleable ? () => handleToggleFixed(e.error_id) : undefined}
                  />
                </div>
                <div className="flex w-8 justify-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={() => handleRemove(e.error_id)}
                    aria-label={`Remove error ${code}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </AssetErrorItem>
            )
          })}
        </div>
      )}
    </div>
  )
}
