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
  toner_life_c: string
  toner_life_m: string
  toner_life_y: string
  toner_life_k: string
}

const CMYK_CHANNELS = [
  { key: 'c', letter: 'C', colorClass: 'text-cyan-500' },
  { key: 'm', letter: 'M', colorClass: 'text-fuchsia-500' },
  { key: 'y', letter: 'Y', colorClass: 'text-yellow-500' },
  { key: 'k', letter: 'K', colorClass: 'text-foreground' },
] as const

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
      <label className="font-medium">{label}</label>
      <Input value={value} onChange={onChange} inputMode="numeric" placeholder="0" />
    </div>
  )
}

function PrefixedIntInput(
  { letter, colorClass, value, onChange }:
  { letter: string; colorClass: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }
) {
  return (
    <div className="relative">
      <span className={`${colorClass} pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium`}>
        {letter}
      </span>
      <Input value={value} onChange={onChange} inputMode="numeric" placeholder="0" className="pl-7" />
    </div>
  )
}

function CMYKInputRow(
  { label, prefix, fields, setIntField }:
  {
    label: string
    prefix: 'drum_life' | 'toner_life'
    fields: SpecFields
    setIntField: (key: keyof SpecFields) => (e: React.ChangeEvent<HTMLInputElement>) => void
  }
) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">{label}</span>
      <div className="grid grid-cols-4 gap-3">
        {CMYK_CHANNELS.map(c => {
          const key = `${prefix}_${c.key}` as keyof SpecFields
          return (
            <PrefixedIntInput
              key={c.key}
              letter={c.letter}
              colorClass={c.colorClass}
              value={fields[key]}
              onChange={setIntField(key)}
            />
          )
        })}
      </div>
    </div>
  )
}

function ReadOnlyInt({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-medium">{label}</label>
      <div className="border-input bg-muted/50 flex h-9 items-center rounded-md border px-3">
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
    toner_life_c: '',
    toner_life_m: '',
    toner_life_y: '',
    toner_life_k: '',
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
        toner_life_c: specs.toner_life_c?.toString() ?? '',
        toner_life_m: specs.toner_life_m?.toString() ?? '',
        toner_life_y: specs.toner_life_y?.toString() ?? '',
        toner_life_k: specs.toner_life_k?.toString() ?? '',
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
    try {
      await updateAssetSpecs(assetDetails!.barcode, {
        cassettes: toNullableInt(fields.cassettes),
        internal_finisher: fields.internal_finisher || null,
        meter_black: toNullableInt(fields.meter_black),
        meter_colour: toNullableInt(fields.meter_colour),
        drum_life_c: toNullableInt(fields.drum_life_c),
        drum_life_m: toNullableInt(fields.drum_life_m),
        drum_life_y: toNullableInt(fields.drum_life_y),
        drum_life_k: toNullableInt(fields.drum_life_k),
        toner_life_c: toNullableInt(fields.toner_life_c),
        toner_life_m: toNullableInt(fields.toner_life_m),
        toner_life_y: toNullableInt(fields.toner_life_y),
        toner_life_k: toNullableInt(fields.toner_life_k),
        accessory_names: selectedFunctions.map(cf => cf.accessory),
      })
      toast.success('Specifications updated.')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
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
              <span className="font-semibold">Meter</span>
              <div className="grid grid-cols-2 gap-3">
                <IntInput label="Black" value={fields.meter_black} onChange={setIntField('meter_black')} />
                <IntInput label="Colour" value={fields.meter_colour} onChange={setIntField('meter_colour')} />
              </div>
            </div>
            <ReadOnlyInt label="Meter Total" value={meterTotal} />
            <IntInput label="Cassettes" value={fields.cassettes} onChange={setIntField('cassettes')} />
            <div className="flex flex-col gap-1.5">
              <label className="font-medium">Internal Finisher</label>
              <Input
                value={fields.internal_finisher}
                onChange={e => setFields(prev => ({ ...prev, internal_finisher: e.target.value }))}
                placeholder="—"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <CMYKInputRow label="Drum Life" prefix="drum_life" fields={fields} setIntField={setIntField} />
            <CMYKInputRow label="Toner Remaining" prefix="toner_life" fields={fields} setIntField={setIntField} />
            <div className="flex flex-col gap-1.5">
              <label className="font-medium">Core Functions</label>
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
