import { InputGroup, InputGroupInput } from '@/components/shadcn/input-group'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { Separator } from '@/components/shadcn/separator'
import { useListKeyboardNavigation } from '@/hooks/use-list-keyboard-navigation'
import { useMemo, useState } from 'react'
import { SearchSelectInput } from './search-select-input'
import { NoResults, RemoveButton, SelectionChip, SuggestionList } from './search-suggestions'
import { rankSuggestions, stripDisallowedChars } from './suggestion-matches'

type MultiSearchSelectInputProps<T extends { id: number }> = {
  selection: T[]
  query: string
  onSelectionChange: (items: T[]) => void
  onQueryChange: (text: string) => void
  onClear: () => void
  options: T[]
  getLabel: (item: T) => string
  getSearchText?: (item: T) => string
  getColumns?: (item: T) => string[]
  placeholder: string
  pluralLabel: string
  maxSelection: number
  clearLabel?: string
  className?: string
}

export function MultiSearchSelectInput<T extends { id: number }>({
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
  pluralLabel,
  maxSelection,
  clearLabel = 'Clear',
  className,
}: MultiSearchSelectInputProps<T>): React.JSX.Element {
  const [popoverOpen, setPopoverOpen] = useState(false)

  if (selection.length === 0) {
    return (
      <SearchSelectInput
        selection={null}
        query={query}
        onSelectionChange={(item) => {
          onSelectionChange([item])
          setPopoverOpen(true)
        }}
        onQueryChange={onQueryChange}
        onClear={onClear}
        options={options}
        getLabel={getLabel}
        getSearchText={getSearchText}
        getColumns={getColumns}
        placeholder={placeholder}
        clearLabel={clearLabel}
        className={className}
      />
    )
  }

  return (
    <SelectionPopover
      selection={selection}
      onSelectionChange={onSelectionChange}
      onClear={onClear}
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      options={options}
      getLabel={getLabel}
      getSearchText={getSearchText}
      getColumns={getColumns}
      pluralLabel={pluralLabel}
      maxSelection={maxSelection}
      clearLabel={clearLabel}
      className={className}
    />
  )
}

function SelectionPopover<T extends { id: number }>({
  selection,
  onSelectionChange,
  onClear,
  open,
  onOpenChange,
  options,
  getLabel,
  getSearchText,
  getColumns,
  pluralLabel,
  maxSelection,
  clearLabel,
  className,
}: {
  selection: T[]
  onSelectionChange: (items: T[]) => void
  onClear: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
  options: T[]
  getLabel: (item: T) => string
  getSearchText: (item: T) => string
  getColumns?: (item: T) => string[]
  pluralLabel: string
  maxSelection: number
  clearLabel: string
  className?: string
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const unselectedOptions = useMemo(() => {
    const selectedIds = new Set(selection.map((item) => item.id))
    return options.filter((option) => !selectedIds.has(option.id))
  }, [options, selection])
  const matches = useMemo(
    () => rankSuggestions(unselectedOptions, search, getSearchText),
    [unselectedOptions, search, getSearchText],
  )
  const { highlightedIndex, onKeyDown, resetHighlight } = useListKeyboardNavigation({
    items: matches,
    onSelect: add,
    onDismiss: () => onOpenChange(false),
  })
  const atMax = selection.length >= maxSelection

  function add(item: T) {
    onSelectionChange([...selection, item])
    setSearch('')
    resetHighlight()
  }

  function remove(item: T) {
    const remaining = selection.filter((selected) => selected.id !== item.id)
    if (remaining.length === 0) onOpenChange(false)
    onSelectionChange(remaining)
  }

  function clearAll() {
    onOpenChange(false)
    onClear()
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className={className}>
          <SelectionChip
            label={
              <PopoverTrigger asChild>
                <button type="button" className="truncate cursor-pointer">
                  {selectionLabel(selection, getLabel, pluralLabel)}
                </button>
              </PopoverTrigger>
            }
            clearLabel={clearLabel}
            onClear={clearAll}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-max min-w-45 max-w-md gap-1 p-1">
        <SearchOrMaxNote
          atMax={atMax}
          maxSelection={maxSelection}
          pluralLabel={pluralLabel}
          search={search}
          onSearchChange={(raw) => {
            setSearch(stripDisallowedChars(raw))
            resetHighlight()
          }}
          onKeyDown={onKeyDown}
        />
        <div className="max-h-72 overflow-y-auto">
          {selection.map((item) => (
            <SelectedRow
              key={item.id}
              label={getLabel(item)}
              removeLabel={`Remove ${getLabel(item)}`}
              onRemove={() => remove(item)}
            />
          ))}
          {!atMax && search.trim().length > 0 && (
            <>
              <Separator className="my-1" />
              <SuggestionList
                matches={matches}
                highlightedIndex={highlightedIndex}
                getLabel={getLabel}
                getColumns={getColumns}
                onSelect={add}
                empty={<NoResults />}
              />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function selectionLabel<T>(
  selection: T[],
  getLabel: (item: T) => string,
  pluralLabel: string,
): string {
  if (selection.length === 1) return getLabel(selection[0])
  return `${pluralLabel}: ${selection.length}`
}

function SearchOrMaxNote({
  atMax,
  maxSelection,
  pluralLabel,
  search,
  onSearchChange,
  onKeyDown,
}: {
  atMax: boolean
  maxSelection: number
  pluralLabel: string
  search: string
  onSearchChange: (raw: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}): React.JSX.Element {
  if (atMax) {
    return (
      <p className="px-2 py-1 text-sm text-muted-foreground">
        {`Maximum ${maxSelection} ${pluralLabel.toLowerCase()}. Remove one to add another.`}
      </p>
    )
  }
  return (
    <InputGroup>
      <InputGroupInput
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={`Add ${pluralLabel.toLowerCase()}`}
        autoComplete="off"
        role="combobox"
      />
    </InputGroup>
  )
}

function SelectedRow({
  label,
  removeLabel,
  onRemove,
}: {
  label: string
  removeLabel: string
  onRemove: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1">
      <span className="font-mono font-medium whitespace-nowrap">{label}</span>
      <RemoveButton label={removeLabel} onClick={onRemove} />
    </div>
  )
}
