import { useListKeyboardNavigation } from '@/hooks/use-list-keyboard-navigation'
import { sanitizeSearchText } from '@/lib/input-sanitizers'
import { useId, useMemo, useState } from 'react'
import type { GlobalSearchResult, SearchEntityType } from 'shared-types'
import { SearchPopoverContent } from '../global-search/search-popover-content'
import {
  buildSearchResultTabs,
  getActiveTabItems,
  resultOptionId,
  type FlatResult,
} from '../global-search/search-results'
import { Input } from '../shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../shadcn/popover'
import type { SelectedCollection } from './collection-search-types'

const SEARCH_PLACEHOLDER = 'Search by ID…'

type CollectionSearchSelectProps = {
  label: string
  query: string
  onQueryChange: (value: string) => void
  isLoading: boolean
  results: GlobalSearchResult
  eligibleTypes: readonly SearchEntityType[]
  onSelect: (collection: SelectedCollection) => void
}

export function CollectionSearchSelect({
  label,
  query,
  onQueryChange,
  isLoading,
  results,
  eligibleTypes,
  onSelect,
}: CollectionSearchSelectProps): React.JSX.Element {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(eligibleTypes[0] ?? '')
  const inputId = useId()
  const listboxId = useId()

  const tabs = useMemo(
    () => buildSearchResultTabs(results, eligibleTypes),
    [results, eligibleTypes],
  )
  const activeItems = getActiveTabItems(tabs, activeTab)

  function handleSelect(item: FlatResult) {
    // Assets are never an eligible target, so this list only ever holds collections.
    if (item.kind === 'asset') return
    setPopoverOpen(false)
    onSelect(item)
  }

  const { highlightedIndex, onKeyDown, resetHighlight } = useListKeyboardNavigation({
    items: activeItems,
    onSelect: handleSelect,
    onDismiss: () => setPopoverOpen(false),
  })

  const [prevTabs, setPrevTabs] = useState(tabs)
  if (tabs !== prevTabs) {
    setPrevTabs(tabs)
    const firstWithResults = tabs.find((tab) => tab.items.length > 0)
    if (firstWithResults) setActiveTab(firstWithResults.type)
    resetHighlight()
  }

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = sanitizeSearchText(event.target.value)
    onQueryChange(value)
    setPopoverOpen(Boolean(value))
    resetHighlight()
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    resetHighlight()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium" htmlFor={inputId}>
        {label}
      </label>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverAnchor asChild>
          <div>
            <Input
              id={inputId}
              autoFocus
              autoComplete="off"
              role="combobox"
              aria-expanded={popoverOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                highlightedIndex >= 0 ? resultOptionId(listboxId, highlightedIndex) : undefined
              }
              placeholder={SEARCH_PLACEHOLDER}
              value={query}
              onChange={handleQueryChange}
              onKeyDown={onKeyDown}
              onFocus={() => setPopoverOpen(Boolean(query))}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-[--radix-popover-anchor-width]"
        >
          <SearchPopoverContent
            isLoading={isLoading}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            listboxId={listboxId}
            highlightedIndex={highlightedIndex}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
