import { useAssetStore } from '@/data/store/asset-store'
import { useListKeyboardNavigation } from '@/hooks/use-list-keyboard-navigation'
import { sanitizeScannedCode } from '@/lib/input-sanitizers'
import { ASSET_SEARCH_TYPES, useGlobalSearch } from '@/hooks/use-global-search'
import { BarcodeIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react'
import type { AssetSummary, BarcodeSuggestion } from 'shared-types'
import { CommandResultList } from '../global-search/command-result-list'
import { resultOptionId } from '../global-search/search-results'
import { Input } from '../shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../shadcn/popover'

const buildAddAssetPlaceholder = (entityName: string) =>
  `Scan barcode or serial to add to this ${entityName}…`

const normalizeCode = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

interface AddAssetsByBarcodeOrSerialProps {
  getAssets: () => { barcode: string }[]
  onAddAsset: (asset: AssetSummary) => void
  entityName: string
  validateAsset?: (asset: AssetSummary) => string | null
  disabled?: boolean
  className?: string
  onCommit?: (asset: AssetSummary) => Promise<void>
  showLeadingIcon?: boolean
}

export function AddAssetsByBarcodeOrSerial({
  getAssets,
  onAddAsset,
  entityName,
  validateAsset,
  disabled,
  className,
  onCommit,
  showLeadingIcon,
}: AddAssetsByBarcodeOrSerialProps): React.JSX.Element {
  const getAssetByBarcode = useAssetStore((state) => state.getAssetByBarcode)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const [displayValue, setDisplayValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [assetError, setAssetError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [suggestionsAllowed, setSuggestionsAllowed] = useState(true)
  const { results } = useGlobalSearch(searchQuery, ASSET_SEARCH_TYPES)
  const suggestions = results.assets

  async function addByBarcode(barcode: string) {
    setAssetError(null)
    setIsLookingUp(true)
    try {
      const asset = await getAssetByBarcode(barcode)
      if (getAssets().some((a) => a.barcode === asset.barcode)) {
        setAssetError(`Asset ${asset.barcode} is already in this ${entityName}.`)
        return
      }
      if (validateAsset) {
        const validationError = validateAsset(asset)
        if (validationError) {
          setAssetError(validationError)
          return
        }
      }
      if (onCommit) {
        try {
          await onCommit(asset)
        } catch {
          return
        }
      } else {
        onAddAsset(asset)
      }
      setDisplayValue('')
      setSearchQuery('')
      inputRef.current?.focus()
    } catch {
      setAssetError('Asset not found.')
    } finally {
      setIsLookingUp(false)
    }
  }

  const normalizedQuery = normalizeCode(searchQuery)
  const exactMatches = useMemo(
    () =>
      suggestions.filter(
        (s) =>
          normalizeCode(s.barcode) === normalizedQuery ||
          normalizeCode(s.serial_number) === normalizedQuery,
      ),
    [suggestions, normalizedQuery],
  )
  const hasExactMatch = exactMatches.length === 1
  const autoAddedQueryRef = useRef<string | null>(null)
  const onAutoAdd = useEffectEvent((barcode: string) => addByBarcode(barcode))

  // An exact match is added automatically, so its suggestion list is never offered.
  const suggestionsAvailable = !!normalizedQuery && !hasExactMatch && suggestions.length > 0
  const popoverOpen = suggestionsAvailable && suggestionsAllowed

  useEffect(() => {
    if (!normalizedQuery) {
      autoAddedQueryRef.current = null
      return
    }
    if (hasExactMatch && autoAddedQueryRef.current !== normalizedQuery) {
      autoAddedQueryRef.current = normalizedQuery
      onAutoAdd(exactMatches[0].barcode)
    }
  }, [exactMatches, hasExactMatch, normalizedQuery])

  function handleSuggestionSelect(suggestion: BarcodeSuggestion) {
    setSuggestionsAllowed(false)
    addByBarcode(suggestion.barcode)
  }

  const {
    highlightedIndex,
    onKeyDown: onSuggestionKeyDown,
    resetHighlight,
  } = useListKeyboardNavigation({
    items: suggestions,
    onSelect: handleSuggestionSelect,
    onDismiss: () => setSuggestionsAllowed(false),
  })

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = sanitizeScannedCode(e.target.value).toUpperCase()
    setDisplayValue(val)
    setSearchQuery(val)
    setAssetError(null)
    setSuggestionsAllowed(true)
    resetHighlight()
  }

  // Enter commits what was typed or scanned unless the user arrowed into a suggestion.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && highlightedIndex < 0) {
      e.preventDefault()
      setSuggestionsAllowed(false)
      if (hasExactMatch) addByBarcode(exactMatches[0].barcode)
      else if (displayValue) addByBarcode(displayValue)
      return
    }
    onSuggestionKeyDown(e)
  }

  return (
    <div className={className}>
      <Popover open={popoverOpen} onOpenChange={(open) => setSuggestionsAllowed(open)}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>
        <PopoverAnchor asChild>
          <div className="relative">
            {showLeadingIcon && (
              <BarcodeIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4 pointer-events-none" />
            )}
            <Input
              ref={inputRef}
              placeholder={buildAddAssetPlaceholder(entityName)}
              aria-label="Add asset by barcode or serial number"
              role="combobox"
              aria-expanded={popoverOpen}
              aria-controls={listboxId}
              aria-activedescendant={
                highlightedIndex >= 0 ? resultOptionId(listboxId, highlightedIndex) : undefined
              }
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className={showLeadingIcon ? 'pl-8 pr-8' : 'pr-8'}
            />
            {isLookingUp && (
              <CircleNotchIcon
                className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                size={16}
              />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="w-[--radix-popover-anchor-width] min-w-80 p-1"
        >
          <CommandResultList
            items={suggestions}
            listboxId={listboxId}
            highlightedIndex={highlightedIndex}
            getKey={(s) => s.barcode}
            getColumns={(s) => [s.barcode, s.serial_number, s.asset_type, s.model]}
            onSelect={handleSuggestionSelect}
          />
        </PopoverContent>
      </Popover>
      {assetError && <p className="text-destructive mt-1">{assetError}</p>}
    </div>
  )
}
