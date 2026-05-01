import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog"
import { Input } from "@/components/shadcn/input"
import MultipleSelector from "@/components/shadcn/multiple-selector"
import { useAssetStore } from "@/data/store/asset-store"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { AssetDetails, CoreFunction } from "shared-types"
import { toast } from "sonner"

interface EditSpecsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  accessories: string[]
}

interface SpecFields {
  meter_black: string
  meter_colour: string
  cassettes: string
  internal_finisher: string
  drum_life_c: string
  drum_life_m: string
  drum_life_y: string
  drum_life_k: string
}

function sanitizeInt(value: string): string {
  return value.replace(/[^\d]/g, '')
}

function toNum(value: string): number {
  return parseInt(value) || 0
}

function toNullableInt(value: string): number | null {
  if (value === '') return null
  const n = parseInt(value)
  return isNaN(n) ? null : n
}

function IntInput({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={onChange} inputMode="numeric" placeholder="0" />
    </div>
  )
}

function ReadOnlyInt({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="border-input bg-muted/50 flex h-9 items-center rounded-md border px-3 text-sm">
        {value}
      </div>
    </div>
  )
}

export function EditSpecsModal({ open, onOpenChange, assetDetails, accessories }: EditSpecsModalProps) {
  const updateAssetSpecs = useAssetStore(state => state.updateAssetSpecs)
  const coreFunctions = useReferenceDataStore(state => state.coreFunctions)

  const [fields, setFields] = useState<SpecFields>({
    meter_black: '',
    meter_colour: '',
    cassettes: '',
    internal_finisher: '',
    drum_life_c: '',
    drum_life_m: '',
    drum_life_y: '',
    drum_life_k: '',
  })
  const [selectedFunctions, setSelectedFunctions] = useState<CoreFunction[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && assetDetails) {
      const { specs } = assetDetails
      setFields({
        meter_black: specs.meter_black?.toString() ?? '',
        meter_colour: specs.meter_colour?.toString() ?? '',
        cassettes: specs.cassettes?.toString() ?? '',
        internal_finisher: specs.internal_finisher ?? '',
        drum_life_c: specs.drum_life_c?.toString() ?? '',
        drum_life_m: specs.drum_life_m?.toString() ?? '',
        drum_life_y: specs.drum_life_y?.toString() ?? '',
        drum_life_k: specs.drum_life_k?.toString() ?? '',
      })
      setSelectedFunctions(coreFunctions.filter(cf => accessories.includes(cf.accessory)))
    }
  }, [open])

  if (!assetDetails) return null

  const meterTotal = toNum(fields.meter_black) + toNum(fields.meter_colour)

  function setIntField(key: keyof SpecFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: sanitizeInt(e.target.value) }))
  }

  const coreFunctionOptions = coreFunctions.map(cf => ({ id: cf.id, label: cf.accessory, value: cf.accessory }))
  const selectedOptions = selectedFunctions.map(cf => ({ id: cf.id, label: cf.accessory, value: cf.accessory }))

  async function handleSave() {
    setSaving(true)
    const response = await updateAssetSpecs(assetDetails!.barcode, {
      cassettes: toNullableInt(fields.cassettes),
      internal_finisher: fields.internal_finisher || null,
      meter_black: toNullableInt(fields.meter_black),
      meter_colour: toNullableInt(fields.meter_colour),
      drum_life_c: toNullableInt(fields.drum_life_c),
      drum_life_m: toNullableInt(fields.drum_life_m),
      drum_life_y: toNullableInt(fields.drum_life_y),
      drum_life_k: toNullableInt(fields.drum_life_k),
      accessory_names: selectedFunctions.map(cf => cf.accessory),
    })
    setSaving(false)
    if (response.success) {
      toast.success('Specifications updated.')
      onOpenChange(false)
    } else {
      toast.error(response.error.summary)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Technical Specifications</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Meter</span>
              <div className="grid grid-cols-2 gap-3">
                <IntInput label="Black" value={fields.meter_black} onChange={setIntField('meter_black')} />
                <IntInput label="Colour" value={fields.meter_colour} onChange={setIntField('meter_colour')} />
              </div>
            </div>
            <ReadOnlyInt label="Meter Total" value={meterTotal} />
            <IntInput label="Cassettes" value={fields.cassettes} onChange={setIntField('cassettes')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Internal Finisher</label>
              <Input
                value={fields.internal_finisher}
                onChange={e => setFields(prev => ({ ...prev, internal_finisher: e.target.value }))}
                placeholder="—"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Drum Life</span>
              <div className="grid grid-cols-2 gap-3">
                <IntInput label="C" value={fields.drum_life_c} onChange={setIntField('drum_life_c')} />
                <IntInput label="M" value={fields.drum_life_m} onChange={setIntField('drum_life_m')} />
                <IntInput label="Y" value={fields.drum_life_y} onChange={setIntField('drum_life_y')} />
                <IntInput label="K" value={fields.drum_life_k} onChange={setIntField('drum_life_k')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Core Functions</label>
              <MultipleSelector
                options={coreFunctionOptions}
                value={selectedOptions}
                onChange={options => setSelectedFunctions(coreFunctions.filter(cf => options.some(o => o.id === cf.id)))}
                placeholder="Select functions…"
                emptyIndicator={<p>No results found.</p>}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={saving}>
            {saving ? <><CircleNotchIcon className="animate-spin" />Saving...</> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
