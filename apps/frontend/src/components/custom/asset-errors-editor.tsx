import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { cn } from '@/lib/utils'
import { TrashIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import type { Error as ReferenceErrorType, UpdateError } from 'shared-types'

/**
 * Props passed to the caller-supplied search input. These match
 * `SearchSelectInput`'s data props, so the caller spreads them on and adds only
 * presentation (placeholder, width). The selected error is appended to the list
 * below — the box itself never holds a selection, so `selection` is always null.
 */
export type AssetErrorsSearchSlotProps = {
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
  renderSearch: (props: AssetErrorsSearchSlotProps) => ReactNode
}

export function AssetErrorsEditor({
  value,
  onChange,
  brandId,
  disabled = false,
  invalid = false,
  renderSearch,
}: AssetErrorsEditorProps) {
  const allErrors = useReferenceDataStore((state) => state.errors)
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
              <div
                key={e.error_id}
                className="flex items-center border-b px-3 py-2 last:border-0 gap-2"
              >
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="font-medium break-words">{code}</span>
                  {description && (
                    <span className="text-xs text-muted-foreground break-words">{description}</span>
                  )}
                </div>
                <div className="flex w-16 justify-center">
                  <Badge asChild variant={e.is_fixed ? 'success' : 'destructive'}>
                    <button
                      type="button"
                      onClick={() => handleToggleFixed(e.error_id)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {e.is_fixed ? 'Fixed' : 'Open'}
                    </button>
                  </Badge>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
