import { PageContent } from '@/components/app-layout/page-content'
import { StickyPageHeader } from '@/components/app-layout/sticky-page-header'
import { AddAssetsByBarcodeOrSerial } from '@/components/collections/add-assets-by-barcode-or-serial'
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
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useWarehouseLocations } from '@/hooks/use-locations'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { sanitizeScannedCode } from '@/lib/input-sanitizers'
import { cn } from '@/lib/utils'
import {
  ArrowRightIcon,
  CircleNotchIcon,
  MapPinIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { AssetLocation, AssetSummary, Warehouse } from 'shared-types'
import { toast } from 'sonner'

const PAGE_TITLE = 'Put Away'
const BIN_ZONE = 'BIN'
const LOCATION_ERROR_DELAY_MS = 500
const LOCATION_NOT_FOUND_MESSAGE = 'Location not available'
const IN_TRANSIT_MESSAGE = 'is in transit — receive the transfer first'
const ALREADY_HERE_PREFIX = 'Already at'
const SCAN_LIST_NAME = 'list'
const ASSET_INPUT_ID = 'put-away-asset'
const EMPTY_LOCATIONS: AssetLocation[] = []

function findScannedLocation(locations: AssetLocation[], scanned: string): AssetLocation | null {
  if (!scanned) return null
  const binMatch = locations.find((l) => l.bin === scanned)
  if (binMatch) return binMatch
  const zoneMatch = locations.find((l) => l.bin === '' && l.zone === scanned && l.zone !== BIN_ZONE)
  return zoneMatch ?? null
}

interface PutAwayForm {
  location: string
}

function sanitizeScan(value: string): string {
  return sanitizeScannedCode(value).toUpperCase()
}

const SCAN_INPUT_SIZE = 'h-12 text-lg md:text-lg'

function scanInputClassName(success: boolean): string {
  return cn(
    SCAN_INPUT_SIZE,
    success &&
      'border-green-600 bg-green-500/10 text-green-800 focus-visible:ring-green-600/40 dark:border-green-500 dark:text-green-300',
  )
}

function locationName(location: AssetLocation): string {
  return location.bin || location.zone
}

function currentLocationLabel(asset: AssetSummary): string {
  if (asset.is_in_transit) return 'In transit'
  if (!asset.location) return 'No location'
  return asset.location.bin || asset.location.zone
}

function atLocation(asset: AssetSummary, location: AssetLocation): boolean {
  if (!asset.location) return false
  return (
    asset.location.warehouse_id === location.warehouse_id &&
    asset.location.zone === location.zone &&
    asset.location.bin === location.bin
  )
}

function assetCountLabel(count: number): string {
  if (count === 1) return '1 asset'
  return `${count} assets`
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

function LocationField({
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
      <FieldLabel htmlFor="put-away-location">Location</FieldLabel>
      <div className="relative">
        <MapPinIcon
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={24}
        />
        <Input
          id="put-away-location"
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="Scan bin or zone"
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

function RowDestination({
  asset,
  location,
  alreadyHere,
}: {
  asset: AssetSummary
  location: AssetLocation | null
  alreadyHere: boolean
}): React.JSX.Element {
  if (alreadyHere && location) {
    return (
      <p className="text-muted-foreground">
        {ALREADY_HERE_PREFIX} {locationName(location)}
      </p>
    )
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{currentLocationLabel(asset)}</span>
      <ArrowRightIcon className="shrink-0" />
      <span className="font-semibold tabular-nums">{location ? locationName(location) : '—'}</span>
    </div>
  )
}

function ScannedAssetRow({
  asset,
  location,
  warehouse,
  onRemove,
}: {
  asset: AssetSummary
  location: AssetLocation | null
  warehouse: Warehouse | null
  onRemove: () => void
}): React.JSX.Element {
  const alreadyHere = !!location && atLocation(asset, location)
  const crossWarehouse =
    !alreadyHere &&
    !!asset.location &&
    !!warehouse &&
    asset.location.warehouse_code !== warehouse.city_code

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {asset.brand} {asset.model}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">{asset.barcode}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${asset.barcode}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <XIcon size={18} />
        </button>
      </div>
      <RowDestination asset={asset} location={location} alreadyHere={alreadyHere} />
      {crossWarehouse ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <WarningIcon className="shrink-0" weight="fill" />
          <span>
            Moving out of {asset.location?.warehouse_code} into {warehouse?.city_code}
          </span>
        </div>
      ) : null}
    </li>
  )
}

export function PutAwayPage(): React.JSX.Element {
  const bulkUpdateAssetLocation = useAssetStore((state) => state.bulkUpdateAssetLocation)

  const activeWarehouses = useActiveWarehouses()
  const defaultWarehouse = useProfileDefaultWarehouse()

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const selectedWarehouse: Warehouse | null =
    activeWarehouses.find((w) => w.id === selectedWarehouseId) ??
    defaultWarehouse ??
    activeWarehouses[0] ??
    null
  const warehouseId = selectedWarehouse?.id

  const { data: locations = EMPTY_LOCATIONS, isLoading: fetchingLocations } = useWarehouseLocations(
    warehouseId ?? null,
  )
  const [saving, setSaving] = useState(false)
  const [scannedAssets, setScannedAssets] = useState<AssetSummary[]>([])
  const assetInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<PutAwayForm>({ defaultValues: { location: '' } })
  const locationValue = useWatch({ control: form.control, name: 'location' })
  const settledLocation = useDebouncedValue(locationValue, LOCATION_ERROR_DELAY_MS)

  const selectedLocation = useMemo(
    () => findScannedLocation(locations, locationValue),
    [locations, locationValue],
  )

  const locationError =
    locationValue && !selectedLocation && settledLocation === locationValue
      ? LOCATION_NOT_FOUND_MESSAGE
      : undefined

  function scanLocation(raw: string, onChange: (value: string) => void) {
    const scanned = sanitizeScan(raw)
    onChange(scanned)
    if (findScannedLocation(locations, scanned)) assetInputRef.current?.focus()
  }

  function selectWarehouse(value: string) {
    setSelectedWarehouseId(Number(value))
    setScannedAssets([])
    form.reset({ location: '' })
  }

  function clearLocation() {
    form.setValue('location', '')
    form.setFocus('location')
  }

  function validateAsset(asset: AssetSummary): string | null {
    if (asset.is_in_transit) return `Asset ${asset.barcode} ${IN_TRANSIT_MESSAGE}.`
    return null
  }

  function addAsset(asset: AssetSummary) {
    setScannedAssets((prev) => {
      if (prev.some((a) => a.barcode === asset.barcode)) return prev
      return [asset, ...prev]
    })
  }

  function removeAsset(barcode: string) {
    setScannedAssets((prev) => prev.filter((a) => a.barcode !== barcode))
  }

  async function handleSave() {
    if (!selectedLocation || scannedAssets.length === 0) return
    const barcodes = [...new Set(scannedAssets.map((a) => a.barcode))]
    setSaving(true)
    try {
      await bulkUpdateAssetLocation({
        warehouse_id: selectedLocation.warehouse_id,
        zone_id: selectedLocation.zone_id,
        bin: selectedLocation.bin,
        barcodes,
      })
      toast.success(
        `Moved ${assetCountLabel(barcodes.length)} to ${locationName(selectedLocation)}`,
        { position: 'top-center' },
      )
      setScannedAssets([])
      assetInputRef.current?.focus()
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
            onValueChange={selectWarehouse}
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
          name="location"
          control={form.control}
          render={({ field }) => (
            <LocationField
              inputRef={field.ref}
              value={field.value}
              onChange={(value) => scanLocation(value, field.onChange)}
              onBlur={field.onBlur}
              onClear={clearLocation}
              error={locationError}
              success={!!selectedLocation}
              disabled={fetchingLocations || saving}
            />
          )}
        />

        <Field>
          <FieldLabel htmlFor={ASSET_INPUT_ID}>Asset</FieldLabel>
          <AddAssetsByBarcodeOrSerial
            ref={assetInputRef}
            getAssets={() => scannedAssets}
            onAddAsset={addAsset}
            entityName={SCAN_LIST_NAME}
            validateAsset={validateAsset}
            disabled={saving}
            inputId={ASSET_INPUT_ID}
            inputClassName={SCAN_INPUT_SIZE}
          />
        </Field>

        {scannedAssets.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              {assetCountLabel(scannedAssets.length)}
            </p>
            <ul className="flex flex-col gap-3">
              {scannedAssets.map((asset) => (
                <ScannedAssetRow
                  key={asset.barcode}
                  asset={asset}
                  location={selectedLocation}
                  warehouse={selectedWarehouse}
                  onRemove={() => removeAsset(asset.barcode)}
                />
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setScannedAssets([])}
                disabled={saving}
                className="h-14 text-lg"
              >
                Clear
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !selectedLocation}
                className="h-14 text-lg"
              >
                {saving ? (
                  <>
                    <CircleNotchIcon className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  `Save ${assetCountLabel(scannedAssets.length)}`
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </PageContent>
    </>
  )
}
