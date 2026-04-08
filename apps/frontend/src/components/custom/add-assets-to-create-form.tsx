import { getHoldDetail } from '@/data/api/hold-api'
import { getAssetByBarcode } from '@/data/api/transfer-api'
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import type { AssetSummary } from 'shared-types'
import { Button } from '../shadcn/button'
import { Field, FieldLabel } from '../shadcn/field'
import { Input } from '../shadcn/input'

interface AddAssetsToCreateFormProps {
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  entityName: string
}

export function AddAssetsToCreateForm({ getAssets, onAddAsset, entityName }: AddAssetsToCreateFormProps): React.JSX.Element {
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const holdInputRef = useRef<HTMLInputElement>(null)
  const [holdError, setHoldError] = useState<string | null>(null)
  const [isLookingUpHold, setIsLookingUpHold] = useState(false)

  async function handleAddAsset() {
    const barcode = barcodeInputRef.current?.value.trim()
    if (!barcode) return

    const currentAssets = getAssets()
    if (currentAssets.some(a => a.barcode === barcode)) {
      setBarcodeError(`Asset ${barcode} is already in this ${entityName}.`)
      return
    }

    setBarcodeError(null)
    setIsLookingUp(true)
    try {
      const asset = await getAssetByBarcode(barcode)
      onAddAsset(asset)
      if (barcodeInputRef.current) barcodeInputRef.current.value = ''
    } catch {
      setBarcodeError('Asset not found.')
    } finally {
      setIsLookingUp(false)
    }
  }

  function onBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddAsset()
    }
  }

  async function handleAddAssetsFromHold() {
    const holdNumber = holdInputRef.current?.value.trim()
    if (!holdNumber) return

    setHoldError(null)
    setIsLookingUpHold(true)
    const res = await getHoldDetail(holdNumber)
    setIsLookingUpHold(false)

    if (!res.success) {
      setHoldError(res.error.status === 404 ? `Hold ${holdNumber} not found.` : res.error.summary)
      return
    }

    const currentIds = new Set(getAssets().map(a => a.id))
    const hasConflict = res.data.assets.some(a => currentIds.has(a.id))
    if (hasConflict) {
      setHoldError(`One or more assets from hold ${holdNumber} are already in this ${entityName}. No assets were added.`)
      return
    }

    res.data.assets.forEach(asset => onAddAsset(asset))
    if (holdInputRef.current) holdInputRef.current.value = ''
  }

  function onHoldKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddAssetsFromHold()
    }
  }

  return (
    <>
      <div className='flex items-end gap-2 max-w-xl'>
        <Field className='flex-1'>
          <FieldLabel>Barcode</FieldLabel>
          <Input
            ref={barcodeInputRef}
            placeholder='Scan or enter barcode'
            onKeyDown={onBarcodeKeyDown}
            onChange={() => setBarcodeError(null)}
          />
          {barcodeError && (
            <p className='text-sm text-destructive mt-1'>{barcodeError}</p>
          )}
        </Field>
        <Button
          variant='secondary'
          type='button'
          onClick={handleAddAsset}
          disabled={isLookingUp}
          className='mb-0.5'
        >
          {isLookingUp
            ? <><CircleNotchIcon className='animate-spin mr-1' size={16} />Looking up...</>
            : <><PlusIcon />Add Asset</>
          }
        </Button>
      </div>

      <div className='flex items-end gap-2 max-w-xl'>
        <Field className='flex-1'>
          <FieldLabel>Hold Number</FieldLabel>
          <Input
            ref={holdInputRef}
            placeholder='Enter hold number'
            onKeyDown={onHoldKeyDown}
            onChange={() => setHoldError(null)}
          />
          {holdError && (
            <p className='text-sm text-destructive mt-1'>{holdError}</p>
          )}
        </Field>
        <Button
          variant='secondary'
          type='button'
          onClick={handleAddAssetsFromHold}
          disabled={isLookingUpHold}
          className='mb-0.5'
        >
          {isLookingUpHold
            ? <><CircleNotchIcon className='animate-spin mr-1' size={16} />Looking up...</>
            : <><PlusIcon />Add Assets from Hold</>
          }
        </Button>
      </div>
    </>
  )
}
