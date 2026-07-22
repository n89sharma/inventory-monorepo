import { Input } from '@/components/shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { useGlobalSearch } from '@/hooks/use-global-search'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { cn } from '@/lib/utils'
import { FROM_GLOBAL_SEARCH_STATE } from '@/ui-types/navigation-context'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchPopoverContent, type FlatResult } from './search-popover-content'

const tabs = ['assets', 'arrivals', 'departures', 'transfers', 'holds', 'invoices'] as const
type Tab = (typeof tabs)[number]

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
  const [activeTab, setActiveTab] = useState<Tab>('assets')
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const hasResults = tabs.some((tab) => results[tab].length > 0)

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

  useEffect(() => {
    const firstWithResults = tabs.find((tab) => results[tab].length > 0)
    if (firstWithResults) setActiveTab(firstWithResults)
  }, [results])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^a-zA-Z0-9-.]/g, '').toUpperCase()
    setQuery(val)
    setPopoverOpen(Boolean(val))
  }

  function navigateTo(item: FlatResult) {
    setPopoverOpen(false)
    setQuery('')
    if (item.kind === 'asset') {
      navigate(`/search/all/${item.data.barcode}`, { state: FROM_GLOBAL_SEARCH_STATE })
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') clearSearch()
  }

  function handlePrefetch(barcode: string) {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current)
    prefetchTimer.current = setTimeout(() => preloadAssetDetail(barcode), 100)
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
              placeholder="Global search…"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
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
            hasResults={hasResults}
            results={results}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as Tab)}
            onSelect={navigateTo}
            onHover={handlePrefetch}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
