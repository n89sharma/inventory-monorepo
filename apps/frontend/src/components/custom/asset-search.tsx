import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { ScrollArea } from '@/components/shadcn/scroll-area'
import { getBarcodeSuggestions, verifyAssetExists } from '@/data/api/asset-api'
import { useAssetStore } from '@/data/store/asset-store'
import { cn } from "@/lib/utils"
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BarcodeSuggestion } from 'shared-types'
import { toast } from 'sonner'

export const AssetSearch = ({ className }: { className?: string }) => {
  const [barcode, setBarcode] = useState("")
  const [invalid, setInvalid] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<BarcodeSuggestion[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const hoverPrefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefetchAssetDetails = useAssetStore(state => state.prefetchAssetDetails)
  const navigate = useNavigate()

  // Typeahead debounce
  useEffect(() => {
    if (!barcode) {
      setSuggestions([])
      setPopoverOpen(false)
      return
    }
    const t = setTimeout(async () => {
      const results = await getBarcodeSuggestions(barcode)
      setSuggestions(results)
      setHighlightedIndex(-1)
      setPopoverOpen(results.length > 0)
    }, 200)
    return () => clearTimeout(t)
  }, [barcode])

  // Keyboard-highlight prefetch
  useEffect(() => {
    if (highlightedIndex < 0 || highlightedIndex >= suggestions.length) return
    const t = setTimeout(() => {
      prefetchAssetDetails(suggestions[highlightedIndex].barcode)
    }, 100)
    return () => clearTimeout(t)
  }, [highlightedIndex])

  function handleHoverPrefetch(barcode: string) {
    if (hoverPrefetchTimer.current) clearTimeout(hoverPrefetchTimer.current)
    hoverPrefetchTimer.current = setTimeout(() => {
      prefetchAssetDetails(barcode)
    }, 100)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBarcode(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase())
    setInvalid(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev)
        break
      case 'ArrowUp':
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          navigateToAsset(suggestions[highlightedIndex].barcode)
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

  function navigateToAsset(target: string) {
    setPopoverOpen(false)
    setHighlightedIndex(-1)
    setBarcode("")
    navigate(`/search/${target}`)
  }

  async function handleSearch(barcodeOverride?: string) {
    const target = barcodeOverride ?? barcode
    if (!target) { setInvalid(true); return }
    setPopoverOpen(false)
    setHighlightedIndex(-1)
    setBarcode("")
    setIsSearching(true)
    try {
      const res = await verifyAssetExists(target)
      if (res.success) {
        navigate(`/search/${target}`)
      } else {
        toast.error(`Asset "${target}" not found.`, { position: 'top-center' })
      }
    } catch {
      toast.error('Something went wrong.', { position: 'top-center' })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); handleSearch() }} className={cn("flex flex-row gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild><div /></PopoverTrigger>
        <PopoverAnchor asChild>
          <Input
            type="text"
            name="barcode"
            autoComplete="off"
            placeholder="Search by barcode…"
            value={barcode}
            aria-invalid={invalid}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
        >
          <ScrollArea>
            {suggestions.map((s, i) => (
              <button
                key={s.barcode}
                type="button"
                role="option"
                aria-selected={highlightedIndex === i}
                onClick={() => navigateToAsset(s.barcode)}
                onMouseDown={e => e.preventDefault()}
                onMouseEnter={() => handleHoverPrefetch(s.barcode)}
                className={cn(
                  "flex text-left p-1 gap-4 items-center cursor-pointer rounded-sm w-full",
                  highlightedIndex === i ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                <span className="text-sm shrink-0 font-mono">{s.barcode}</span>
                <span className="text-muted-foreground text-xs shrink-0">{s.asset_type}</span>
                <span className="text-muted-foreground text-xs shrink-0">{s.model}</span>
              </button>
            ))}
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
