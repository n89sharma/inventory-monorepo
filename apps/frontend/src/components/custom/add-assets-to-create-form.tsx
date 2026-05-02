import { AddFromHoldModal } from '@/components/modals/add-from-hold-modal'
import { getAssetByBarcode } from '@/data/api/transfer-api'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import type { AssetSummary } from 'shared-types'
import { Button } from '../shadcn/button'
import { Field, FieldLabel, FieldLegend, FieldSet } from '../shadcn/field'
import { Input } from '../shadcn/input'

interface AddAssetByBarcodeProps {
  getAssets: () => AssetSummary[]
  onAddAsset: (asset: AssetSummary) => void
  entityName: string
  validateAsset?: (asset: AssetSummary) => string | null
}

export function AddAssetByBarcode({ getAssets, onAddAsset, entityName, validateAsset }: AddAssetByBarcodeProps): React.JSX.Element {
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)

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
      if (validateAsset) {
        const validationError = validateAsset(asset)
        if (validationError) {
          setBarcodeError(validationError)
          return
        }
      }
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

  return (
    <div className='flex flex-col'>
      <div className='flex-1 flex flex-col justify-center'>
        <Field>
          <FieldLabel>Barcode</FieldLabel>
          <Input
            ref={barcodeInputRef}
            placeholder='Scan or enter barcode…'
            onKeyDown={onBarcodeKeyDown}
            onChange={() => setBarcodeError(null)}
          />
          {barcodeError && (
            <p className='text-sm text-destructive mt-1'>{barcodeError}</p>
          )}
        </Field>
      </div>
      <Button
        variant='secondary'
        type='button'
        onClick={handleAddAsset}
        disabled={isLookingUp}
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
              <p className='text-sm font-medium'>Hold</p>
              <p className='text-sm text-muted-foreground'>Adds all assets from the selected hold</p>
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
