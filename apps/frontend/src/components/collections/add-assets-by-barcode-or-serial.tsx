import { useAssetStore } from '@/data/store/asset-store'
import { useListKeyboardNavigation } from '@/hooks/use-list-keyboard-navigation'
import { sanitizeScannedCode } from '@/lib/input-sanitizers'
import { cn } from '@/lib/utils'
import { ASSET_SEARCH_TYPES, useGlobalSearch } from '@/hooks/use-global-search'
import { BarcodeIcon, CircleNotchIcon } from '@phosphor-icons/react'
import { useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react'
import type { AssetSummary, BarcodeSuggestion } from 'shared-types'
import { CommandResultList } from '../global-search/command-result-list'
import { resultOptionId } from '../global-search/search-results'
import { Input } from '../shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../shadcn/popover'

const ADD_ASSET_PLACEHOLDER = 'Scan barcode or serial…'

const normalizeCode = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const PREFIX_POSITION = 'absolute top-1/2 -translate-y-1/2 pointer-events-none'

// The chip states what the box does, which a placeholder stops doing the moment a code is
// typed into it. Without a label there is nothing to chip, so the glyph stands alone.
function InputPrefix({
  label,
  showIcon,
}: {
  label?: string
  showIcon?: boolean
}): React.JSX.Element | null {
  if (label === undefined) {
    if (!showIcon) return null
    return (
      <BarcodeIcon
        className={`${PREFIX_POSITION} text-muted-foreground left-2.5 size-4`}
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      className={`${PREFIX_POSITION} text-foreground left-1 flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium`}
      aria-hidden="true"
    >
      {label}
      {showIcon && <BarcodeIcon className="size-3.5" />}
    </span>
  )
}

interface AddAssetsByBarcodeOrSerialProps {
  getAssets: () => { barcode: string }[]
  onAddAsset: (asset: AssetSummary) => void
  entityName: string
  validateAsset?: (asset: AssetSummary) => string | null
  disabled?: boolean
  className?: string
  inputId?: string
  inputClassName?: string
  onCommit?: (asset: AssetSummary) => Promise<void>
  showLeadingIcon?: boolean
  prefixLabel?: string
  autoFocus?: boolean
  ref?: React.Ref<HTMLInputElement>
}

export function AddAssetsByBarcodeOrSerial({
  getAssets,
  onAddAsset,
  entityName,
  validateAsset,
  disabled,
  className,
  inputId,
  inputClassName,
  onCommit,
  showLeadingIcon,
  prefixLabel,
  autoFocus,
  ref,
}: AddAssetsByBarcodeOrSerialProps): React.JSX.Element {
  const getAssetByBarcode = useAssetStore((state) => state.getAssetByBarcode)
  const inputRef = useRef<HTMLInputElement>(null)
  const assignInput = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
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
            <InputPrefix label={prefixLabel} showIcon={showLeadingIcon} />
            <Input
              id={inputId}
              ref={assignInput}
              placeholder={ADD_ASSET_PLACEHOLDER}
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
              autoFocus={autoFocus}
              className={cn(prefixLabel ? 'pl-24' : 'pl-8', 'pr-8', inputClassName)}
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
