import { AddFromHoldModal } from '@/components/modals/add-from-hold-modal'
import { useAssetStore } from '@/data/store/asset-store'
import { useSearchStore } from '@/data/store/search-store'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { AssetSummary, BarcodeSuggestion } from 'shared-types'
import { Button } from '../shadcn/button'
import { Field, FieldLabel, FieldLegend, FieldSet } from '../shadcn/field'
import { Input } from '../shadcn/input'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../shadcn/popover'
import { CommandResultList } from './global-search/command-result-list'

interface AddAssetByBarcodeProps {
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  entityName: string
  validateAsset?: (asset: AssetSummary) => string | null
}

export function AddAssetByBarcode({ getAssets, onAddAsset, entityName, validateAsset }: AddAssetByBarcodeProps): React.JSX.Element {
  const getAssetByBarcode = useAssetStore(state => state.getAssetByBarcode)
  const searchGlobal = useSearchStore(state => state.searchGlobal)
  const inputRef = useRef<HTMLInputElement>(null)
  const [displayValue, setDisplayValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [resolvedBarcode, setResolvedBarcode] = useState<string | null>(null)
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
    }, 150)
    return () => clearTimeout(t)
  }, [searchQuery])

  async function handleAddAsset() {
    if (!resolvedBarcode) return

    setAssetError(null)
    setIsLookingUp(true)
    try {
      const asset = await getAssetByBarcode(resolvedBarcode)
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
      setResolvedBarcode(null)
      setSuggestions([])
      setPopoverOpen(false)
    } catch {
      setAssetError('Asset not found.')
    } finally {
      setIsLookingUp(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (resolvedBarcode !== null) {
      // displayValue holds "BC · SN" which contains characters outside the allowed set.
      // Sanitizing the edited value would produce garbled output — reset to empty instead.
      setDisplayValue('')
      setSearchQuery('')
      setResolvedBarcode(null)
      setAssetError(null)
      return
    }
    const val = e.target.value.replace(/[^a-zA-Z0-9-.]/g, '').toUpperCase()
    setDisplayValue(val)
    setSearchQuery(val)
    setAssetError(null)
  }

  function handleSuggestionSelect(suggestion: BarcodeSuggestion) {
    setDisplayValue(suggestion.serial_number
      ? `${suggestion.barcode} · ${suggestion.serial_number}`
      : suggestion.barcode
    )
    setSearchQuery('')
    setResolvedBarcode(suggestion.barcode)
    setPopoverOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      setPopoverOpen(false)
      handleAddAsset()
    } else if (e.key === 'Escape') {
      setPopoverOpen(false)
    }
  }

  return (
    <div className='flex flex-col'>
      <div className='flex-1 flex flex-col justify-center'>
        <Field>
          <FieldLabel>Barcode / Serial</FieldLabel>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild><div /></PopoverTrigger>
            <PopoverAnchor asChild>
              <Input
                ref={inputRef}
                placeholder='Scan or enter barcode / serial…'
                value={displayValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
              />
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
          {assetError && (
            <p className='text-destructive mt-1'>{assetError}</p>
          )}
        </Field>
      </div>
      <Button
        variant='secondary'
        type='button'
        onClick={handleAddAsset}
        disabled={!resolvedBarcode || isLookingUp}
        className='mt-3'
      >
        {isLookingUp
          ? <><CircleNotchIcon className='animate-spin mr-1' size={16} />Looking up…</>
          : <>Add Asset</>
        }
      </Button>
    </div>
  )
}

interface AddAssetsToCreateFormProps {
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  entityName: string
}

export function AddAssetsToCreateForm({ getAssets, onAddAsset, entityName }: AddAssetsToCreateFormProps): React.JSX.Element {
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false)

  return (
    <>
      <FieldSet className='border rounded-md p-4'>
        <FieldLegend>Add assets by:</FieldLegend>
        <div className='grid grid-cols-[1fr_auto_1fr] gap-6 items-stretch'>

          <AddAssetByBarcode getAssets={getAssets} onAddAsset={onAddAsset} entityName={entityName} />

          <div className='relative flex flex-col items-center'>
            <div className='flex-1 w-px bg-border' />
            <span className='absolute top-1/2 -translate-y-1/2 bg-background px-1.5 text-xs text-muted-foreground'>or</span>
          </div>

          <div className='flex flex-col'>
            <div className='flex-1 flex flex-col justify-center gap-1'>
              <p className='font-medium'>Hold</p>
              <p className='text-muted-foreground'>Adds all assets from the selected hold</p>
            </div>
            <Button
              variant='secondary'
              type='button'
              onClick={() => setIsHoldModalOpen(true)}
              className='mt-3'
            >
              Add from Hold
            </Button>
          </div>

        </div>
      </FieldSet>

      <AddFromHoldModal
        open={isHoldModalOpen}
        onOpenChange={setIsHoldModalOpen}
        getAssets={getAssets}
        onAddAsset={onAddAsset}
      />
    </>
  )
}
