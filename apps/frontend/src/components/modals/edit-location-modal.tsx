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
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { AssetDetails, AssetLocation, Warehouse } from "shared-types"
import { toast } from "sonner"
import { PopoverSearch } from "../custom/popover-search"

interface EditLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
}

const ALLOWED_CHARS = /[^a-zA-Z0-9-]/g

function filterLocationInput(val: string): string {
  return val.replace(ALLOWED_CHARS, '')
}

export function EditLocationModal({ open, onOpenChange, assetDetails }: EditLocationModalProps) {
  const updateAssetLocation = useAssetStore(state => state.updateAssetLocation)
  const getLocationsByWarehouse = useAssetStore(state => state.getLocationsByWarehouse)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = warehouses.filter(w => w.is_active)

  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [locations, setLocations] = useState<AssetLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<AssetLocation | null>(null)
  const [fetchingLocations, setFetchingLocations] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !assetDetails) return
    const currentWarehouse = warehouses.find(w => w.city_code === assetDetails.warehouse_code) ?? null
    setSelectedWarehouse(currentWarehouse)
    setSelectedLocation(null)
    if (currentWarehouse) {
      loadLocations(currentWarehouse)
    } else {
      setLocations([])
    }
  }, [open])

  async function loadLocations(warehouse: Warehouse) {
    setFetchingLocations(true)
    setLocations([])
    const response = await getLocationsByWarehouse(warehouse.id)
    setLocations(response.success ? response.data : [])
    setFetchingLocations(false)
  }

  function handleWarehouseChange(id: string) {
    const found = activeWarehouses.find(w => String(w.id) === id) ?? null
    setSelectedWarehouse(found)
    setSelectedLocation(null)
    if (found) {
      loadLocations(found)
    } else {
      setLocations([])
    }
  }

  if (!assetDetails) return null

  async function handleSave() {
    if (!selectedLocation) {
      toast.error('Please select a location.')
      return
    }
    setSaving(true)
    const response = await updateAssetLocation(assetDetails!.barcode, { location_id: selectedLocation.id })
    setSaving(false)
    if (response.success) {
      toast.success('Location updated.')
      onOpenChange(false)
    } else {
      toast.error(response.error.summary)
    }
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

          {fetchingLocations
            ? <div className="flex items-center gap-2 text-muted-foreground"><CircleNotchIcon className="animate-spin" />Loading locations…</div>
            : selectedWarehouse && locations.length === 0
              ? <p className="text-muted-foreground">No locations available</p>
              : <PopoverSearch
                  selection={selectedLocation}
                  onSelectionChange={setSelectedLocation}
                  onClear={() => setSelectedLocation(null)}
                  options={locations}
                  getLabel={l => l.location}
                  searchKey="location"
                  fieldLabel="Location"
                  fieldRequired={true}
                  filterInput={filterLocationInput}
                />
          }
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={saving || !selectedLocation}>
            {saving ? <><CircleNotchIcon className="animate-spin" />Saving…</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
