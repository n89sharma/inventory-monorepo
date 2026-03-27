import { useState, useMemo, useRef, useEffect } from 'react'
import Fuse from 'fuse.js'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../shadcn/popover'
import { ScrollArea } from '../shadcn/scroll-area'
import { XIcon } from '@phosphor-icons/react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '../shadcn/input-group'
import { Field, FieldLabel } from '../shadcn/field'
import { cn } from '@/lib/utils'

export type PopoverSearchProps<T> = {
  selection: T | null | undefined
  onSelectionChange: (i: T) => void
  onClear: () => void
  options: T[]
  getLabel: (i: T) => string
  searchKey: string
  fieldLabel: string
  fieldRequired: boolean
  error?: boolean
  className?: string
}

export function PopoverSearch<T>({
  selection,
  onSelectionChange,
  onClear,
  options,
  getLabel,
  searchKey,
  fieldLabel,
  fieldRequired,
  error,
  className }: PopoverSearchProps<T>): React.JSX.Element {

  const [matches, setMatches] = useState<T[]>([])
  const [userInput, setUserInput] = useState(selection ? getLabel(selection) : '')
  const [popoverOpen, setPopoverOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)


  useEffect(() => {
    if (!selection) setUserInput('')
  }, [selection])

  let fuse = useMemo(() => {
    return new Fuse(
      options,
      {
        keys: [searchKey],
        threshold: 0.5,
        shouldSort: true
      })
  }, [options])

  function updateSearch(inputVal: string) {
    setUserInput(inputVal)

    if (!inputVal.trim()) {
      setMatches([])
      setPopoverOpen(false)
      return
    }
    setMatches(fuse.search(inputVal, { limit: 6 }).map(r => r.item))
    setPopoverOpen(true)
  }

  function handleSelect(item: T) {
    setUserInput(getLabel(item))
    onSelectionChange(item)
    setPopoverOpen(false)
    setMatches([])
  }

  function handleClear() {
    setUserInput('')
    onClear()
    setPopoverOpen(false)
    setMatches([])
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {

    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => prev < matches.length - 1 ? prev + 1 : prev)
        break

      case 'ArrowUp':
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break

      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < matches.length) {
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

  return (
    <div className={className}>
      <Popover
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverAnchor asChild>
          <Field data-invalid={error}>
            <FieldLabel>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive">*</span>}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                value={userInput ?? ''}
                onChange={e => updateSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                placeholder='Start typing to see suggestions...'
                required={fieldRequired}
                autoComplete="off"
                role="combobox"
                aria-invalid={error}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-sm"
                  onClick={handleClear}
                  hidden={!userInput || !userInput.length}
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
          className="w-[var(--radix-popover-trigger-width)]"
        >
          <ScrollArea>
            {matches.map((m, i) => (
              <button
                key={`${getLabel(m)}-${i}`}
                type="button"
                role="option"
                aria-selected={highlightedIndex === i}
                onClick={() => handleSelect(m)}
                onMouseDown={e => { e.preventDefault() }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(m) } }}
                className={cn(
                  "w-full text-left p-2 cursor-pointer rounded-sm",
                  highlightedIndex === i
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                {getLabel(m)}
              </button>))}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}