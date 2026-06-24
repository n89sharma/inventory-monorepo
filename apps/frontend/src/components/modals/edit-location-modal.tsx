import { UnsavedChangesDialog } from '@/components/custom/unsaved-changes-dialog'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Field, FieldLabel } from '@/components/shadcn/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { useAssetStore } from '@/data/store/asset-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { formatTitleCase } from '@/lib/formatters'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { AssetDetails, AssetLocation, Warehouse, Zone } from 'shared-types'
import { toast } from 'sonner'
import { SearchSelectInput } from '../custom/search-select-input'

interface EditLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
}

interface LocationForm {
  warehouse: Warehouse | null
  zone: Zone | null
  bin: AssetLocation | null
}

const BIN_ZONE = 'BIN'
const ALLOWED_BIN_CHARS = /[^a-zA-Z0-9-]/g

function filterBinInput(val: string): string {
  return val.replace(ALLOWED_BIN_CHARS, '')
}

export function EditLocationModal({ open, onOpenChange, assetDetails }: EditLocationModalProps) {
  const updateAssetLocation = useAssetStore((state) => state.updateAssetLocation)
  const getLocationsByWarehouse = useAssetStore((state) => state.getLocationsByWarehouse)
  const warehouses = useReferenceDataStore((state) => state.warehouses)
  const zones = useReferenceDataStore((state) => state.zones)
  const activeWarehouses = useActiveWarehouses()

  const values = useMemo<LocationForm>(
    () => ({
      warehouse:
        warehouses.find((w) => w.city_code === assetDetails?.location?.warehouse_code) ?? null,
      zone: null,
      bin: null,
    }),
    [assetDetails, warehouses],
  )

  const form = useForm<LocationForm>({ values })
  const selectedWarehouse = useWatch({ control: form.control, name: 'warehouse' })
  const selectedZone = useWatch({ control: form.control, name: 'zone' })
  const selectedBin = useWatch({ control: form.control, name: 'bin' })

  const [binLocations, setBinLocations] = useState<AssetLocation[]>([])
  const [binQuery, setBinQuery] = useState('')
  const [fetchingLocations, setFetchingLocations] = useState(false)
  const [saving, setSaving] = useState(false)

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  useEffect(() => {
    if (!selectedWarehouse) {
      setBinLocations([])
      return
    }
    let cancelled = false
    setFetchingLocations(true)
    setBinLocations([])
    getLocationsByWarehouse(selectedWarehouse.id)
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
  }, [selectedWarehouse, getLocationsByWarehouse])

  if (!assetDetails) return null

  const isBinZone = selectedZone?.zone === BIN_ZONE
  const canSave = !!selectedWarehouse && !!selectedZone && (!isBinZone || !!selectedBin)

  function handleWarehouseChange(id: string) {
    const found = activeWarehouses.find((w) => String(w.id) === id) ?? null
    form.setValue('warehouse', found, { shouldDirty: true })
    form.setValue('bin', null, { shouldDirty: true })
  }

  function handleZoneChange(id: string) {
    const found = zones.find((z) => String(z.id) === id) ?? null
    form.setValue('zone', found, { shouldDirty: true })
    form.setValue('bin', null, { shouldDirty: true })
  }

  async function handleSave() {
    if (!selectedWarehouse || !selectedZone) {
      toast.error('Please select a warehouse and zone.', { position: 'top-center' })
      return
    }
    if (isBinZone && !selectedBin) {
      toast.error('Please select a bin.', { position: 'top-center' })
      return
    }
    setSaving(true)
    try {
      await updateAssetLocation(assetDetails!.barcode, {
        warehouse_id: selectedWarehouse.id,
        zone_id: selectedZone.id,
        bin: isBinZone ? selectedBin!.bin : '',
      })
      form.reset(form.getValues())
      toast.success('Location updated.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  function renderBinField() {
    if (fetchingLocations) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CircleNotchIcon className="animate-spin" />
          Loading bins…
        </div>
      )
    }
    if (binLocations.length === 0) {
      return <p className="text-muted-foreground">No bins available for this warehouse</p>
    }
    return (
      <Field>
        <FieldLabel>
          Bin
          <span className="text-destructive">*</span>
        </FieldLabel>
        <SearchSelectInput
          selection={selectedBin}
          query={binQuery}
          onSelectionChange={(loc) => {
            form.setValue('bin', loc, { shouldDirty: true })
            setBinQuery('')
          }}
          onQueryChange={setBinQuery}
          onClear={() => {
            form.setValue('bin', null, { shouldDirty: true })
            setBinQuery('')
          }}
          options={binLocations}
          getLabel={(l) => l.bin}
          sanitize={filterBinInput}
          placeholder=""
          clearLabel="Clear bin"
        />
      </Field>
    )
  }

  return (
    <Dialog open={open} onOpenChange={guard.onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Warehouse</FieldLabel>
            <Select
              value={selectedWarehouse ? String(selectedWarehouse.id) : ''}
              onValueChange={handleWarehouseChange}
            >
              <SelectTrigger>
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
          </Field>

          <Field>
            <FieldLabel>Zone</FieldLabel>
            <Select
              value={selectedZone ? String(selectedZone.id) : ''}
              onValueChange={handleZoneChange}
              disabled={!selectedWarehouse}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a zone" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={String(z.id)}>
                      {formatTitleCase(z.zone)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {isBinZone && renderBinField()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => guard.onOpenChange(false)}
            type="button"
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={saving || !canSave}>
            {saving ? (
              <>
                <CircleNotchIcon className="animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      <UnsavedChangesDialog
        open={guard.confirmOpen}
        onOpenChange={guard.setConfirmOpen}
        onDiscard={guard.discard}
      />
    </Dialog>
  )
}
