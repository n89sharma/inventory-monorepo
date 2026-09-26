import { cn } from '@/lib/utils'
import { XIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/shadcn/badge'
import { Field } from '@/components/shadcn/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/shadcn/input-group'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { useListKeyboardNavigation } from '@/hooks/use-list-keyboard-navigation'
import { NoResults, SuggestionList } from './search-suggestions'
import { rankSuggestions, stripDisallowedChars } from './suggestion-matches'

export type SearchSelectInputProps<T> = {
  selection: T | null
  query: string
  onSelectionChange: (item: T) => void
  onQueryChange: (text: string) => void
  onClear: () => void
  options: T[]
  getLabel: (item: T) => string
  getSearchText?: (item: T) => string
  getColumns?: (item: T) => string[]
  placeholder: string
  clearLabel?: string
  className?: string
  error?: boolean
  disabled?: boolean
  sanitize?: (raw: string) => string
  onCreateOption?: (query: string) => void
  createLabel?: (query: string) => string
}

const defaultCreateLabel = (query: string): string => `Create "${query}"`

export function SearchSelectInput<T>({
  selection,
  query,
  onSelectionChange,
  onQueryChange,
  onClear,
  options,
  getLabel,
  getSearchText = getLabel,
  getColumns,
  placeholder,
  clearLabel = 'Clear',
  className,
  error,
  disabled,
  sanitize = stripDisallowedChars,
  onCreateOption,
  createLabel = defaultCreateLabel,
}: SearchSelectInputProps<T>): React.JSX.Element {
  const [matches, setMatches] = useState<T[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const { highlightedIndex, onKeyDown, resetHighlight } = useListKeyboardNavigation({
    items: matches,
    onSelect: handleSelect,
    onDismiss: dismissSuggestions,
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const [focusInputOnAttach, setFocusInputOnAttach] = useState(false)

  function attachInput(node: HTMLInputElement | null) {
    inputRef.current = node
    if (!node || !focusInputOnAttach) return
    setFocusInputOnAttach(false)
    node.focus()
  }

  function updateSearch(rawInput: string) {
    const clean = sanitize(rawInput)
    onQueryChange(clean)
    const hasQuery = clean.trim().length > 0
    setMatches(rankSuggestions(options, clean, getSearchText))
    setPopoverOpen(hasQuery)
    if (!hasQuery) resetHighlight()
  }

  function dismissSuggestions() {
    setPopoverOpen(false)
    resetHighlight()
  }

  function resetSuggestions() {
    setPopoverOpen(false)
    setMatches([])
    resetHighlight()
  }

  function handleSelect(item: T) {
    onSelectionChange(item)
    resetSuggestions()
  }

  function handleCreate() {
    if (!onCreateOption) return
    const clean = query.trim()
    if (!clean) return
    onCreateOption(clean)
    resetSuggestions()
  }

  function clearSelection() {
    onClear()
    resetSuggestions()
    setFocusInputOnAttach(true)
  }

  function clearQuery() {
    onClear()
    resetSuggestions()
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown(e)
    if (e.key === 'Enter' && matches.length === 0 && onCreateOption && query.trim()) {
      e.preventDefault()
      handleCreate()
    } else if (e.key === 'Tab') {
      dismissSuggestions()
    }
  }

  if (selection) {
    return (
      <div className={className}>
        <Field data-invalid={error}>
          <div
            data-slot="search-select-selection"
            className="flex h-8 min-w-0 items-center rounded-lg border border-input bg-input/30 px-1.5"
          >
            <Badge variant="secondary" className="min-w-0 max-w-full gap-1 pr-0.5">
              <span className="truncate">{getLabel(selection)}</span>
              <button
                type="button"
                onClick={clearSelection}
                aria-label={clearLabel}
                className={cn(
                  'ml-0.5 inline-flex size-4 shrink-0 items-center justify-center',
                  'rounded-full hover:bg-foreground/10',
                )}
              >
                <XIcon aria-hidden="true" />
              </button>
            </Badge>
          </div>
        </Field>
      </div>
    )
  }

  return (
    <div className={className}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverAnchor asChild>
          <Field data-invalid={error}>
            <InputGroup>
              <InputGroupInput
                value={query}
                onChange={(e) => updateSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={attachInput}
                placeholder={placeholder}
                autoComplete="off"
                role="combobox"
                aria-invalid={error}
                disabled={disabled}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  onClick={clearQuery}
                  hidden={!query.length}
                  type="button"
                  aria-label="Clear"
                >
                  <XIcon aria-hidden="true" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
          }}
          className="w-max min-w-45 max-w-md p-1"
        >
          <div className="max-h-72 overflow-y-auto">
            <SuggestionList
              matches={matches}
              highlightedIndex={highlightedIndex}
              getLabel={getLabel}
              getColumns={getColumns}
              onSelect={handleSelect}
              empty={
                query.trim() && (
                  <EmptySuggestions
                    onCreate={onCreateOption && handleCreate}
                    createLabel={createLabel(query.trim())}
                  />
                )
              }
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function EmptySuggestions({
  onCreate,
  createLabel,
}: {
  onCreate?: () => void
  createLabel: string
}): React.JSX.Element {
  if (!onCreate) return <NoResults />
  return (
    <button
      type="button"
      onClick={onCreate}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
      className="block w-full cursor-pointer rounded-sm px-2 py-1 text-left whitespace-nowrap hover:bg-accent/50"
    >
      {createLabel}
    </button>
  )
}
