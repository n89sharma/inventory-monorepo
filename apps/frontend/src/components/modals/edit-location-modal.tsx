import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog"
import { Field, FieldLabel } from "@/components/shadcn/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { useAssetStore } from "@/data/store/asset-store"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { formatSentenceCase } from "@/lib/formatters"
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { AssetDetails, AssetLocation, Warehouse, Zone } from "shared-types"
import { toast } from "sonner"
import { SearchSelectInput } from "../custom/search-select-input"

interface EditLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
}

const BIN_ZONE = 'BIN'
const ALLOWED_BIN_CHARS = /[^a-zA-Z0-9-]/g

function filterBinInput(val: string): string {
  return val.replace(ALLOWED_BIN_CHARS, '')
}

export function EditLocationModal({ open, onOpenChange, assetDetails }: EditLocationModalProps) {
  const updateAssetLocation = useAssetStore(state => state.updateAssetLocation)
  const getLocationsByWarehouse = useAssetStore(state => state.getLocationsByWarehouse)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const zones = useReferenceDataStore(state => state.zones)
  const activeWarehouses = warehouses.filter(w => w.is_active)

  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [binLocations, setBinLocations] = useState<AssetLocation[]>([])
  const [selectedBin, setSelectedBin] = useState<AssetLocation | null>(null)
  const [binQuery, setBinQuery] = useState('')
  const [fetchingLocations, setFetchingLocations] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !assetDetails) return
    const currentWarehouse = warehouses.find(w => w.city_code === assetDetails.location?.warehouse_code) ?? null
    setSelectedWarehouse(currentWarehouse)
    setSelectedZone(null)
    setSelectedBin(null)
    if (currentWarehouse) {
      loadBinLocations(currentWarehouse)
    } else {
      setBinLocations([])
    }
  }, [open])

  async function loadBinLocations(warehouse: Warehouse) {
    setFetchingLocations(true)
    setBinLocations([])
    try {
      const all = await getLocationsByWarehouse(warehouse.id)
      setBinLocations(all.filter(l => l.zone === BIN_ZONE))
    } catch {
      // interceptor already showed the error toast
    }
    setFetchingLocations(false)
  }

  function handleWarehouseChange(id: string) {
    const found = activeWarehouses.find(w => String(w.id) === id) ?? null
    setSelectedWarehouse(found)
    setSelectedBin(null)
    if (found) {
      loadBinLocations(found)
    } else {
      setBinLocations([])
    }
  }

  function handleZoneChange(id: string) {
    const found = zones.find(z => String(z.id) === id) ?? null
    setSelectedZone(found)
    setSelectedBin(null)
  }

  if (!assetDetails) return null

  const isBinZone = selectedZone?.zone === BIN_ZONE
  const canSave = !!selectedWarehouse && !!selectedZone && (!isBinZone || !!selectedBin)

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
        bin: isBinZone ? selectedBin!.bin : ''
      })
      toast.success('Location updated.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  {activeWarehouses.map(w => (
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
                  {zones.map(z => (
                    <SelectItem key={z.id} value={String(z.id)}>
                      {formatSentenceCase(z.zone)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          {isBinZone && (
            fetchingLocations
              ? <div className="flex items-center gap-2 text-muted-foreground"><CircleNotchIcon className="animate-spin" />Loading bins…</div>
              : binLocations.length === 0
                ? <p className="text-muted-foreground">No bins available for this warehouse</p>
                : <Field>
                    <FieldLabel>
                      Bin
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <SearchSelectInput
                      selection={selectedBin}
                      query={binQuery}
                      onSelectionChange={loc => { setSelectedBin(loc); setBinQuery('') }}
                      onQueryChange={setBinQuery}
                      onClear={() => { setSelectedBin(null); setBinQuery('') }}
                      options={binLocations}
                      searchKey="bin"
                      getLabel={l => l.bin}
                      sanitize={filterBinInput}
                      placeholder=""
                      clearLabel="Clear bin"
                    />
                  </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={saving || !canSave}>
            {saving ? <><CircleNotchIcon className="animate-spin" />Saving…</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
