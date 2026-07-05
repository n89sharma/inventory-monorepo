import { PageContent } from '@/components/app-layout/page-content'
import { StickyPageHeader } from '@/components/collections/sticky-page-header'
import { Button } from '@/components/shadcn/button'
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { useAssetStore } from '@/data/store/asset-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { cn } from '@/lib/utils'
import {
  ArrowRightIcon,
  CircleNotchIcon,
  MapPinIcon,
  PrinterIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { AssetLocation, AssetSummary, Warehouse } from 'shared-types'
import { toast } from 'sonner'

const PAGE_TITLE = 'Put Away'
const BIN_ZONE = 'BIN'
const SCAN_SANITIZER = /[^a-zA-Z0-9-.]/g
const BIN_ERROR_DELAY_MS = 500
const ASSET_LOOKUP_DELAY_MS = 500

interface PutAwayForm {
  bin: string
  asset: string
}

function sanitizeScan(value: string): string {
  return value.replace(SCAN_SANITIZER, '').toUpperCase()
}

function scanInputClassName(success: boolean): string {
  return cn(
    'h-12 text-lg md:text-lg',
    success &&
      'border-green-600 bg-green-500/10 text-green-800 focus-visible:ring-green-600/40 dark:border-green-500 dark:text-green-300',
  )
}

function currentLocationLabel(asset: AssetSummary): string {
  if (!asset.location) return 'No location'
  return asset.location.bin || asset.location.zone
}

function ClearButton({ onClear }: { onClear: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear"
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    >
      <XIcon size={18} />
    </button>
  )
}

function AssetAdornment({
  lookingUp,
  value,
  onClear,
}: {
  lookingUp: boolean
  value: string
  onClear: () => void
}): React.JSX.Element | null {
  if (lookingUp) {
    return (
      <CircleNotchIcon
        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
        size={18}
      />
    )
  }
  if (value) return <ClearButton onClear={onClear} />
  return null
}

function BinField({
  inputRef,
  value,
  onChange,
  onBlur,
  onClear,
  error,
  success,
  disabled,
}: {
  inputRef: React.Ref<HTMLInputElement>
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onClear: () => void
  error?: string
  success: boolean
  disabled: boolean
}): React.JSX.Element {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="put-away-bin">Bin</FieldLabel>
      <div className="relative">
        <MapPinIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={24}
        />
        <Input
          id="put-away-bin"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Scan bin barcode"
          disabled={disabled}
          aria-invalid={!!error}
          autoComplete="off"
          className={cn(scanInputClassName(success), 'pl-11 pr-10')}
        />
        {value ? <ClearButton onClear={onClear} /> : null}
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function AssetField({
  inputRef,
  value,
  onChange,
  onBlur,
  onClear,
  error,
  success,
  disabled,
  lookingUp,
}: {
  inputRef: React.Ref<HTMLInputElement>
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  onClear: () => void
  error?: string
  success: boolean
  disabled: boolean
  lookingUp: boolean
}): React.JSX.Element {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="put-away-asset">Asset</FieldLabel>
      <div className="relative">
        <PrinterIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={24}
        />
        <Input
          id="put-away-asset"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Scan asset barcode"
          disabled={disabled}
          aria-invalid={!!error}
          autoComplete="off"
          className={cn(scanInputClassName(success), 'pl-11 pr-10')}
        />
        <AssetAdornment lookingUp={lookingUp} value={value} onClear={onClear} />
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

export function PutAwayPage(): React.JSX.Element {
  const getLocationsByWarehouse = useAssetStore((state) => state.getLocationsByWarehouse)
  const getAssetByBarcode = useAssetStore((state) => state.getAssetByBarcode)
  const updateAssetLocation = useAssetStore((state) => state.updateAssetLocation)

  const activeWarehouses = useActiveWarehouses()
  const defaultWarehouse = useProfileDefaultWarehouse()

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const selectedWarehouse: Warehouse | null =
    activeWarehouses.find((w) => w.id === selectedWarehouseId) ??
    defaultWarehouse ??
    activeWarehouses[0] ??
    null
  const warehouseId = selectedWarehouse?.id

  const [binLocations, setBinLocations] = useState<AssetLocation[]>([])
  const [fetchingLocations, setFetchingLocations] = useState(false)
  const [selectedBin, setSelectedBin] = useState<AssetLocation | null>(null)
  const [scannedAsset, setScannedAsset] = useState<AssetSummary | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<PutAwayForm>({ defaultValues: { bin: '', asset: '' } })
  const binValue = form.watch('bin')
  const assetValue = form.watch('asset')

  const binSuccess = !!selectedBin && !form.formState.errors.bin
  const assetSuccess = !!scannedAsset && !form.formState.errors.asset
  const crossWarehouse =
    !!scannedAsset?.location &&
    !!selectedWarehouse &&
    scannedAsset.location.warehouse_code !== selectedWarehouse.city_code

  useEffect(() => {
    form.reset({ bin: '', asset: '' })
    setSelectedBin(null)
    setScannedAsset(null)
    if (!warehouseId) {
      setBinLocations([])
      return
    }
    let cancelled = false
    setFetchingLocations(true)
    getLocationsByWarehouse(warehouseId)
      .then((all) => {
        if (!cancelled) setBinLocations(all.filter((l) => l.zone === BIN_ZONE))
      })
      .catch(() => {
        /* interceptor already showed the error toast */
      })
      .finally(() => {
        if (!cancelled) setFetchingLocations(false)
      })
    return () => {
      cancelled = true
    }
  }, [warehouseId, getLocationsByWarehouse, form])

  useEffect(() => {
    form.setFocus('bin')
  }, [form])

  useEffect(() => {
    if (!binValue) {
      setSelectedBin(null)
      form.clearErrors('bin')
      return
    }
    const match = binLocations.find((l) => l.bin === binValue)
    if (match) {
      setSelectedBin(match)
      form.clearErrors('bin')
      form.setFocus('asset')
      return
    }
    setSelectedBin(null)
    const timer = setTimeout(
      () => form.setError('bin', { type: 'manual', message: 'Bin not available' }),
      BIN_ERROR_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [binValue, binLocations, form])

  useEffect(() => {
    if (!assetValue) {
      setScannedAsset(null)
      form.clearErrors('asset')
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setLookingUp(true)
      getAssetByBarcode(assetValue, true)
        .then((asset) => {
          if (cancelled) return
          setScannedAsset(asset)
          form.clearErrors('asset')
        })
        .catch(() => {
          if (cancelled) return
          setScannedAsset(null)
          form.setError('asset', { type: 'manual', message: 'Asset not found' })
        })
        .finally(() => {
          if (!cancelled) setLookingUp(false)
        })
    }, ASSET_LOOKUP_DELAY_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [assetValue, getAssetByBarcode, form])

  function resetAsset() {
    form.setValue('asset', '')
    setScannedAsset(null)
    form.clearErrors('asset')
    form.setFocus('asset')
  }

  function clearBin() {
    form.setValue('bin', '')
    setSelectedBin(null)
    form.clearErrors('bin')
    form.setFocus('bin')
  }

  async function handleConfirm() {
    if (!scannedAsset || !selectedBin) return
    setSaving(true)
    try {
      await updateAssetLocation(scannedAsset.barcode, {
        warehouse_id: selectedBin.warehouse_id,
        zone_id: selectedBin.zone_id,
        bin: selectedBin.bin,
      })
      toast.success(`Moved ${scannedAsset.barcode} to ${selectedBin.bin}`, {
        position: 'top-center',
      })
      resetAsset()
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  return (
    <>
      <StickyPageHeader>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{PAGE_TITLE}</h1>
          <Select
            value={selectedWarehouse ? String(selectedWarehouse.id) : ''}
            onValueChange={(value) => setSelectedWarehouseId(Number(value))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select a warehouse" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectGroup>
                {activeWarehouses.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.city_code} — {w.street}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </StickyPageHeader>

      <PageContent className="flex max-w-xl flex-col gap-6">
        <Controller
          name="bin"
          control={form.control}
          render={({ field, fieldState }) => (
            <BinField
              inputRef={field.ref}
              value={field.value}
              onChange={(value) => field.onChange(sanitizeScan(value))}
              onBlur={field.onBlur}
              onClear={clearBin}
              error={fieldState.error?.message}
              success={binSuccess}
              disabled={fetchingLocations || saving}
            />
          )}
        />

        <Controller
          name="asset"
          control={form.control}
          render={({ field, fieldState }) => (
            <AssetField
              inputRef={field.ref}
              value={field.value}
              onChange={(value) => field.onChange(sanitizeScan(value))}
              onBlur={field.onBlur}
              onClear={resetAsset}
              error={fieldState.error?.message}
              success={assetSuccess}
              disabled={fetchingLocations || saving}
              lookingUp={lookingUp}
            />
          )}
        />

        {scannedAsset && selectedBin ? (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div>
              <p className="text-lg font-semibold">
                {scannedAsset.brand} {scannedAsset.model}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">{scannedAsset.barcode}</p>
            </div>
            <div className="flex items-center gap-3 text-base">
              <span className="text-muted-foreground">{currentLocationLabel(scannedAsset)}</span>
              <ArrowRightIcon className="shrink-0" />
              <span className="font-semibold tabular-nums">{selectedBin.bin}</span>
            </div>
            {crossWarehouse ? (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                <WarningIcon className="shrink-0" weight="fill" />
                <span>
                  Moving out of {scannedAsset.location?.warehouse_code} into{' '}
                  {selectedWarehouse?.city_code}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {scannedAsset && selectedBin ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetAsset}
              disabled={saving}
              className="h-14 text-lg"
            >
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={saving} className="h-14 text-lg">
              {saving ? (
                <>
                  <CircleNotchIcon className="animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        ) : null}
      </PageContent>
    </>
  )
}
