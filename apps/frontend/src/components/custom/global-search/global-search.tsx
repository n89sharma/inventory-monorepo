import { Input } from '@/components/shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { getGlobalSearchResults } from '@/data/api/search-api'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GlobalSearchResult } from 'shared-types'
import { SearchPopoverContent, type FlatResult } from './search-popover-content'

const emptyResults: GlobalSearchResult = { assets: [], arrivals: [], departures: [], transfers: [], holds: [], invoices: [] }

const tabs = ['assets', 'arrivals', 'departures', 'transfers', 'holds', 'invoices'] as const
type Tab = typeof tabs[number]

export const GlobalSearch = ({ className }: { className?: string }) => {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult>(emptyResults)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('assets')
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const hasResults = tabs.some(tab => results[tab].length > 0)

  useEffect(() => {
    if (!query) return
    const t = setTimeout(async () => {
      const res = await getGlobalSearchResults(query)
      setResults(res)
      setIsLoading(false)
      const firstWithResults = tabs.find(tab => res[tab].length > 0)
      if (firstWithResults) setActiveTab(firstWithResults)
    }, 150)
    return () => clearTimeout(t)
  }, [query])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^a-zA-Z0-9-.]/g, '').toUpperCase()
    setQuery(val)
    if (val) {
      setPopoverOpen(true)
      setIsLoading(true)
    } else {
      setPopoverOpen(false)
      setIsLoading(false)
      setResults(emptyResults)
    }
  }

  function navigateTo(item: FlatResult) {
    setPopoverOpen(false)
    setQuery("")
    if (item.kind === 'asset') {
      navigate(`/search/${item.data.barcode}`)
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

  function handlePrefetch(barcode: string) {
    if (prefetchTimer.current) clearTimeout(prefetchTimer.current)
    prefetchTimer.current = setTimeout(() => preloadAssetDetail(barcode), 100)
  }

  return (
    <div className={cn("flex flex-row gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild><div /></PopoverTrigger>
        <PopoverAnchor asChild>
          <Input
            type="text"
            name="search"
            autoComplete="off"
            placeholder="Global search…"
            value={query}
            onChange={handleInputChange}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
          className="w-[--radix-popover-anchor-width] min-w-100"
        >
          <SearchPopoverContent
            isLoading={isLoading}
            hasResults={hasResults}
            results={results}
            activeTab={activeTab}
            onTabChange={tab => setActiveTab(tab as Tab)}
            onSelect={navigateTo}
            onHover={handlePrefetch}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
