import { useState } from "react"
import {
  ANY_OPTION,
  getSelectOption,
  getSelectedOrNull,
  type SelectOption,
} from "@/ui-types/select-option-types"
import { SearchSelectInput } from "./search-select-input"

/**
 * List-page filter binding for {@link SearchSelectInput}: adapts the
 * `SelectOption<T>` filter state (SELECTED / ANY) used by the summary pages.
 * Clearing resets to `ANY_OPTION`. Holds the transient typeahead text locally.
 */
type SearchSelectOptionFilterProps<T> = {
  selection: SelectOption<T>
  onChange: (next: SelectOption<T>) => void
  options: T[]
  searchKey: string
  getLabel: (item: T) => string
  placeholder: string
  clearLabel?: string
  className?: string
}

export function SearchSelectOptionFilter<T>({
  selection,
  onChange,
  options,
  searchKey,
  getLabel,
  placeholder,
  clearLabel,
  className,
}: SearchSelectOptionFilterProps<T>): React.JSX.Element {
  const [query, setQuery] = useState('')
  return (
    <SearchSelectInput
      selection={getSelectedOrNull(selection)}
      query={query}
      onSelectionChange={item => { onChange(getSelectOption(item)); setQuery('') }}
      onQueryChange={setQuery}
      onClear={() => { onChange(ANY_OPTION); setQuery('') }}
      options={options}
      searchKey={searchKey}
      getLabel={getLabel}
      placeholder={placeholder}
      clearLabel={clearLabel}
      className={className}
    />
  )
}
