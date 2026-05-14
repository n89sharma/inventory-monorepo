import { AddFromHoldModal } from '@/components/modals/add-from-hold-modal'
import { useAssetStore } from '@/data/store/asset-store'
import { useSearchStore } from '@/data/store/search-store'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { AssetSummary, BarcodeSuggestion } from 'shared-types'
import { Button } from '../shadcn/button'
import { Input } from '../shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../shadcn/popover'
import { CommandResultList } from './global-search/command-result-list'

const BARCODE_INPUT_SANITIZER = /[^a-zA-Z0-9-.]/g
const SUGGESTION_DEBOUNCE_MS = 150

interface AddAssetByBarcodeProps {
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  entityName: string
  validateAsset?: (asset: AssetSummary) => string | null
  disabled?: boolean
  className?: string
}

export function AddAssetByBarcode({
  getAssets,
  onAddAsset,
  entityName,
  validateAsset,
  disabled,
  className
}: AddAssetByBarcodeProps): React.JSX.Element {
  const getAssetByBarcode = useAssetStore(state => state.getAssetByBarcode)
  const searchGlobal = useSearchStore(state => state.searchGlobal)
  const inputRef = useRef<HTMLInputElement>(null)
  const [displayValue, setDisplayValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [assetError, setAssetError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [suggestions, setSuggestions] = useState<BarcodeSuggestion[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)

  useEffect(() => {
    if (!searchQuery) {
      setSuggestions([])
      setPopoverOpen(false)
      return
    }
    const t = setTimeout(async () => {
      const res = await searchGlobal(searchQuery)
      setSuggestions(res.assets)
      setPopoverOpen(res.assets.length > 0)
    }, SUGGESTION_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function addByBarcode(barcode: string) {
    setAssetError(null)
    setIsLookingUp(true)
    try {
      const asset = await getAssetByBarcode(barcode)
      if (getAssets().some(a => a.barcode === asset.barcode)) {
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
      onAddAsset(asset)
      setDisplayValue('')
      setSearchQuery('')
      setSuggestions([])
      setPopoverOpen(false)
      inputRef.current?.focus()
    } catch {
      setAssetError('Asset not found.')
    } finally {
      setIsLookingUp(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(BARCODE_INPUT_SANITIZER, '').toUpperCase()
    setDisplayValue(val)
    setSearchQuery(val)
    setAssetError(null)
  }

  function handleSuggestionSelect(suggestion: BarcodeSuggestion) {
    setPopoverOpen(false)
    addByBarcode(suggestion.barcode)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      setPopoverOpen(false)
      if (displayValue) addByBarcode(displayValue)
    } else if (e.key === 'Escape') {
      setPopoverOpen(false)
    }
  }

  return (
    <div className={className}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild><div /></PopoverTrigger>
        <PopoverAnchor asChild>
          <div className='relative'>
            <Input
              ref={inputRef}
              placeholder='Scan or enter barcode / serial…'
              aria-label='Add asset by barcode or serial number'
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || isLookingUp}
              className='pr-8'
            />
            {isLookingUp && (
              <CircleNotchIcon
                className='absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground'
                size={16}
              />
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align='start'
          onOpenAutoFocus={e => e.preventDefault()}
          onCloseAutoFocus={e => e.preventDefault()}
          className='w-[--radix-popover-anchor-width] min-w-80 p-1'
        >
          <CommandResultList
            items={suggestions}
            getKey={s => s.barcode}
            getValue={s => s.barcode}
            getColumns={s => [s.barcode, s.serial_number, s.asset_type, s.model]}
            onSelect={handleSuggestionSelect}
          />
        </PopoverContent>
      </Popover>
      {assetError && <p className='text-destructive mt-1'>{assetError}</p>}
    </div>
  )
}

interface AddFromHoldButtonProps {
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  disabled?: boolean
}

export function AddFromHoldButton({
  getAssets,
  onAddAsset,
  disabled
}: AddFromHoldButtonProps): React.JSX.Element {
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false)

  return (
    <>
      <Button
        variant='secondary'
        type='button'
        onClick={() => setIsHoldModalOpen(true)}
        disabled={disabled}
      >
        Add from Hold
      </Button>
      <AddFromHoldModal
        open={isHoldModalOpen}
        onOpenChange={setIsHoldModalOpen}
        getAssets={getAssets}
        onAddAsset={onAddAsset}
      />
    </>
  )
}
