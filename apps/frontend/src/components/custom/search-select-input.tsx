import { cn } from '@/lib/utils'
import { XIcon } from '@phosphor-icons/react'
import { defaultFilter } from 'cmdk'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '../shadcn/badge'
import { Field } from '../shadcn/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '../shadcn/input-group'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../shadcn/popover'

const DISALLOWED_CHARS_PATTERN = /[^a-zA-Z0-9\s\-_.]/g
const SUGGESTION_LIMIT = 10

export type SearchSelectInputProps<T> = {
  selection: T | null
  query: string
  onSelectionChange: (item: T) => void
  onQueryChange: (text: string) => void
  onClear: () => void
  options: T[]
  getLabel: (item: T) => string
  placeholder: string
  clearLabel?: string
  className?: string
  error?: boolean
  sanitize?: (raw: string) => string
}

function stripDisallowedChars(raw: string): string {
  return raw.replace(DISALLOWED_CHARS_PATTERN, '')
}

export function SearchSelectInput<T>({
  selection,
  query,
  onSelectionChange,
  onQueryChange,
  onClear,
  options,
  getLabel,
  placeholder,
  clearLabel = 'Clear',
  className,
  error,
  sanitize = stripDisallowedChars,
}: SearchSelectInputProps<T>): React.JSX.Element {
  const [matches, setMatches] = useState<T[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFocus, setPendingFocus] = useState(false)

  useEffect(() => {
    if (pendingFocus && !selection && inputRef.current) {
      inputRef.current.focus()
      setPendingFocus(false)
    }
  }, [pendingFocus, selection])

  function updateSearch(rawInput: string) {
    const clean = sanitize(rawInput)
    onQueryChange(clean)
    if (!clean.trim()) {
      setMatches([])
      setPopoverOpen(false)
      setHighlightedIndex(-1)
      return
    }
    const needle = clean.toLowerCase()
    const substringMatches = options
      .map(option => ({ option, index: getLabel(option).toLowerCase().indexOf(needle) }))
      .filter(result => result.index !== -1)
      .sort((a, b) =>
        a.index - b.index || getLabel(a.option).length - getLabel(b.option).length,
      )
      .map(result => result.option)

    const ranked = substringMatches.length > 0
      ? substringMatches
      : options
          .map(option => ({ option, score: defaultFilter(getLabel(option), clean) }))
          .filter(result => result.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(result => result.option)

    setMatches(ranked.slice(0, SUGGESTION_LIMIT))
    setPopoverOpen(true)
  }

  function handleSelect(item: T) {
    onSelectionChange(item)
    setPopoverOpen(false)
    setMatches([])
    setHighlightedIndex(-1)
  }

  function handleClear() {
    onClear()
    setPopoverOpen(false)
    setMatches([])
    setHighlightedIndex(-1)
    setPendingFocus(true)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => (prev < matches.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < matches.length) {
          e.preventDefault()
          handleSelect(matches[highlightedIndex])
        }
        break
      case 'Escape':
        setPopoverOpen(false)
        setHighlightedIndex(-1)
        break
      case 'Tab':
        setPopoverOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  if (selection) {
    return (
      <div className={className}>
        <Field data-invalid={error}>
          <div className="flex h-8 min-w-0 items-center rounded-lg border border-input bg-input/30 px-1.5">
            <Badge variant="secondary" className="min-w-0 max-w-full gap-1 pr-0.5">
              <span className="truncate">{getLabel(selection)}</span>
              <button
                type="button"
                onClick={handleClear}
                aria-label={clearLabel}
                className={cn(
                  "ml-0.5 inline-flex size-4 shrink-0 items-center justify-center",
                  "rounded-full hover:bg-foreground/10",
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
                onChange={e => updateSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                placeholder={placeholder}
                autoComplete="off"
                role="combobox"
                aria-invalid={error}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  onClick={handleClear}
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
          onOpenAutoFocus={e => { e.preventDefault() }}
          onCloseAutoFocus={e => { e.preventDefault() }}
          className="w-max min-w-45 max-w-md"
        >
          <div className="max-h-72 overflow-y-auto">
            {matches.map((m, i) => (
              <button
                key={`${getLabel(m)}-${i}`}
                type="button"
                role="option"
                aria-selected={highlightedIndex === i}
                onClick={() => handleSelect(m)}
                onMouseDown={e => { e.preventDefault() }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(m)
                  }
                }}
                className={cn(
                  "block w-full text-left p-2 cursor-pointer rounded-sm whitespace-nowrap",
                  highlightedIndex === i
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
              >
                {getLabel(m)}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
