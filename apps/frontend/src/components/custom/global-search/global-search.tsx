import { Input } from '@/components/shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { getGlobalSearchResults } from '@/data/api/search-api'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GlobalSearchResult } from 'shared-types'
import { SearchPopoverContent, type FlatResult } from './search-popover-content'

const emptyResults: GlobalSearchResult = { assets: [], arrivals: [], departures: [] }

export const GlobalSearch = ({ className }: { className?: string }) => {
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult>(emptyResults)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('assets')
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const hasResults = results.assets.length > 0 || results.arrivals.length > 0 || results.departures.length > 0

  useEffect(() => {
    if (!query) return
    const t = setTimeout(async () => {
      const res = await getGlobalSearchResults(query)
      setResults(res)
      setIsLoading(false)
      const firstWithResults = (['assets', 'arrivals', 'departures'] as const).find(tab =>
        tab === 'assets' ? res.assets.length > 0
        : tab === 'arrivals' ? res.arrivals.length > 0
        : res.departures.length > 0
      )
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
    } else {
      navigate(`/departures/${item.data.departure_number}`)
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
            onTabChange={setActiveTab}
            onSelect={navigateTo}
            onHover={handlePrefetch}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
