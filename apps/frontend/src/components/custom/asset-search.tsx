import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { ScrollArea } from '@/components/shadcn/scroll-area'
import { getGlobalSearchResults } from '@/data/api/search-api'
import { useAssetStore } from '@/data/store/asset-store'
import { formatDate } from '@/lib/formatters'
import { cn } from "@/lib/utils"
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ArrivalSuggestion, BarcodeSuggestion, GlobalSearchResult } from 'shared-types'
import { toast } from 'sonner'

type FlatResult =
  | { kind: 'asset'; data: BarcodeSuggestion }
  | { kind: 'arrival'; data: ArrivalSuggestion }

function flattenResults(results: GlobalSearchResult): FlatResult[] {
  return [
    ...results.assets.map(a => ({ kind: 'asset' as const, data: a })),
    ...results.arrivals.map(a => ({ kind: 'arrival' as const, data: a })),
  ]
}

export const AssetSearch = ({ className }: { className?: string }) => {
  const [query, setQuery] = useState("")
  const [invalid, setInvalid] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<GlobalSearchResult>({ assets: [], arrivals: [] })
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const hoverPrefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const getAssetDetails = useAssetStore(state => state.getAssetDetails)
  const navigate = useNavigate()

  const flat = flattenResults(results)
  const hasResults = flat.length > 0

  // Typeahead debounce
  useEffect(() => {
    if (!query) {
      setResults({ assets: [], arrivals: [] })
      setPopoverOpen(false)
      return
    }
    const t = setTimeout(async () => {
      const res = await getGlobalSearchResults(query)
      setResults(res)
      setHighlightedIndex(-1)
      setPopoverOpen(res.assets.length > 0 || res.arrivals.length > 0)
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  // Keyboard-highlight prefetch (assets only)
  useEffect(() => {
    if (highlightedIndex < 0 || highlightedIndex >= flat.length) return
    const item = flat[highlightedIndex]
    if (item.kind !== 'asset') return
    const t = setTimeout(() => {
      getAssetDetails(item.data.barcode)
    }, 100)
    return () => clearTimeout(t)
  }, [highlightedIndex])

  function handleHoverPrefetch(barcode: string) {
    if (hoverPrefetchTimer.current) clearTimeout(hoverPrefetchTimer.current)
    hoverPrefetchTimer.current = setTimeout(() => {
      getAssetDetails(barcode)
    }, 100)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value.replace(/[^a-zA-Z0-9-.]/g, '').toUpperCase())
    setInvalid(false)
  }

  function navigateTo(item: FlatResult) {
    setPopoverOpen(false)
    setHighlightedIndex(-1)
    setQuery("")
    if (item.kind === 'asset') {
      navigate(`/search/${item.data.barcode}`)
    } else {
      navigate(`/arrivals/${item.data.arrival_number}`)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => prev < flat.length - 1 ? prev + 1 : prev)
        break
      case 'ArrowUp':
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < flat.length) {
          navigateTo(flat[highlightedIndex])
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

  async function handleSearch() {
    if (!query) { setInvalid(true); return }
    setIsSearching(true)
    try {
      const res = await getGlobalSearchResults(query)
      const items = flattenResults(res)
      if (items.length === 0) {
        toast.error(`No results found for "${query}".`, { position: 'top-center' })
      } else if (items.length === 1) {
        navigateTo(items[0])
      } else {
        setResults(res)
        setHighlightedIndex(-1)
        setPopoverOpen(true)
      }
    } catch {
      toast.error('Something went wrong.', { position: 'top-center' })
    } finally {
      setIsSearching(false)
    }
  }

  let flatIndex = -1

  return (
    <form onSubmit={e => { e.preventDefault(); handleSearch() }} className={cn("flex flex-row gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild><div /></PopoverTrigger>
        <PopoverAnchor asChild>
          <Input
            type="text"
            name="search"
            autoComplete="off"
            placeholder="Search by barcode or serial…"
            value={query}
            aria-invalid={invalid}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="placeholder:text-xs"
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
          className="w-[--radix-popover-anchor-width] min-w-100"
        >
          <ScrollArea>
            {hasResults && (
              <div className="flex flex-col">
                {results.assets.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium px-1 py-1 uppercase tracking-wide">Assets</p>
                    {results.assets.map(s => {
                      flatIndex++
                      const idx = flatIndex
                      return (
                        <button
                          key={s.barcode}
                          type="button"
                          role="option"
                          aria-selected={highlightedIndex === idx}
                          onClick={() => navigateTo({ kind: 'asset', data: s })}
                          onMouseDown={e => e.preventDefault()}
                          onMouseEnter={() => handleHoverPrefetch(s.barcode)}
                          className={cn(
                            "flex text-left p-1 gap-4 items-center cursor-pointer rounded-sm w-full",
                            highlightedIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          )}
                        >
                          <span className="text-sm shrink-0 font-mono">{s.barcode}</span>
                          <span className="text-muted-foreground text-xs shrink-0 font-mono">{s.serial_number}</span>
                          <span className="text-muted-foreground text-xs shrink-0">{s.asset_type}</span>
                          <span className="text-muted-foreground text-xs shrink-0">{s.model}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {results.arrivals.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium px-1 py-1 uppercase tracking-wide">Arrivals</p>
                    {results.arrivals.map(s => {
                      flatIndex++
                      const idx = flatIndex
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="option"
                          aria-selected={highlightedIndex === idx}
                          onClick={() => navigateTo({ kind: 'arrival', data: s })}
                          onMouseDown={e => e.preventDefault()}
                          className={cn(
                            "flex text-left p-1 gap-4 items-center cursor-pointer rounded-sm w-full",
                            highlightedIndex === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          )}
                        >
                          <span className="text-sm shrink-0 font-mono">{s.arrival_number}</span>
                          <span className="text-muted-foreground text-xs shrink-0">{s.vendor}</span>
                          <span className="text-muted-foreground text-xs shrink-0">{s.warehouse_code}</span>
                          <span className="text-muted-foreground text-xs shrink-0">{formatDate(s.created_at)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <Button type="submit" variant="secondary" className="rounded-md" disabled={isSearching}>
        {isSearching
          ? <><CircleNotchIcon className="animate-spin mr-1" size={16} />Searching</>
          : 'Search'}
      </Button>
    </form>
  )
}
