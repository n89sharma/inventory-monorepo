import { Input } from '@/components/shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { useGlobalSearch } from '@/hooks/use-global-search'
import { useListKeyboardNavigation } from '@/hooks/use-list-keyboard-navigation'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { sanitizeSearchText } from '@/lib/input-sanitizers'
import { cn } from '@/lib/utils'
import { assetDetailHref } from '@/ui-types/navigation-context'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { SEARCH_ENTITY_TYPES } from 'shared-types'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchPopoverContent } from './search-popover-content'
import {
  buildSearchResultTabs,
  getActiveTabItems,
  resultOptionId,
  type FlatResult,
} from './search-results'

const PREFETCH_DELAY_MS = 100

function SearchInputAdornment({ query, onClear }: { query: string; onClear: () => void }) {
  if (query) {
    return (
      <button
        onClick={onClear}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label="Clear search"
      >
        <XIcon className="size-4" />
      </button>
    )
  }
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
      <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-px text-[10px] font-medium text-muted-foreground">
        Ctrl
      </kbd>
      <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-px text-[10px] font-medium text-muted-foreground">
        K
      </kbd>
    </div>
  )
}

export const GlobalSearch = ({ className }: { className?: string }) => {
  const [query, setQuery] = useState('')
  const { results, isLoading } = useGlobalSearch(query)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>(SEARCH_ENTITY_TYPES[0])
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const navigate = useNavigate()

  const tabs = useMemo(() => buildSearchResultTabs(results, SEARCH_ENTITY_TYPES), [results])
  const activeItems = getActiveTabItems(tabs, activeTab)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function navigateTo(item: FlatResult) {
    setPopoverOpen(false)
    setQuery('')
    if (item.kind === 'asset') {
      navigate(assetDetailHref(item.data.barcode))
    } else if (item.kind === 'arrival') {
      navigate(`/arrivals/${item.data.arrival_number}`)
    } else if (item.kind === 'departure') {
      navigate(`/departures/${item.data.departure_number}`)
    } else if (item.kind === 'transfer') {
      navigate(`/transfers/${item.data.transfer_number}`)
    } else if (item.kind === 'hold') {
      navigate(`/holds/${item.data.hold_number}`)
    } else {
      navigate(`/invoices/${item.data.invoice_number}`)
    }
  }

  function clearSearch() {
    setQuery('')
    setPopoverOpen(false)
    inputRef.current?.blur()
  }

  const { highlightedIndex, onKeyDown, resetHighlight } = useListKeyboardNavigation({
    items: activeItems,
    onSelect: navigateTo,
    onDismiss: clearSearch,
  })

  const [prevTabs, setPrevTabs] = useState(tabs)
  if (tabs !== prevTabs) {
    setPrevTabs(tabs)
    const firstWithResults = tabs.find((tab) => tab.items.length > 0)
    if (firstWithResults) setActiveTab(firstWithResults.type)
    resetHighlight()
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = sanitizeSearchText(e.target.value)
    setQuery(val)
    setPopoverOpen(Boolean(val))
    resetHighlight()
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    resetHighlight()
  }

  function handlePrefetch(item: FlatResult) {
    if (item.kind !== 'asset') return
    const { barcode } = item.data
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current)
    prefetchTimer.current = setTimeout(() => preloadAssetDetail(barcode), PREFETCH_DELAY_MS)
  }

  return (
    <div className={cn('flex flex-row gap-2', className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverAnchor asChild>
          <div className="relative w-96">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              name="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={popoverOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                highlightedIndex >= 0 ? resultOptionId(listboxId, highlightedIndex) : undefined
              }
              placeholder="Global search…"
              value={query}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              className="pl-8 pr-20"
            />
            <SearchInputAdornment query={query} onClear={clearSearch} />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-[--radix-popover-anchor-width] min-w-100"
        >
          <SearchPopoverContent
            isLoading={isLoading}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            listboxId={listboxId}
            highlightedIndex={highlightedIndex}
            onSelect={navigateTo}
            onHover={handlePrefetch}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
