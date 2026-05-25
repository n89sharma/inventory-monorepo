import { ConsumablesCell, ConsumablesGrid, ConsumablesRow } from "@/components/custom/consumables-grid"
import { FormSection } from "@/components/custom/form-section"
import { HorizontalField } from "@/components/custom/horizontal-field"
import { PopoverSearchInline } from "@/components/custom/popover-search"
import { ReadinessPicker } from "@/components/custom/readiness-picker"
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
import { formatSentenceCase } from "@/lib/formatters"
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { AssetDetails, CoreFunction, Country, Status } from "shared-types"
import { toast } from "sonner"

interface EditSpecsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
  accessories: string[]
}

type CMYKChannel = 'c' | 'm' | 'y' | 'k'

interface CMYKValues {
  c: number | null
  m: number | null
  y: number | null
  k: number | null
}

interface SpecFields {
  readiness: Status | null
  country: Country | null
  meter_black: number | null
  meter_colour: number | null
  cassettes: number | null
  internal_finisher: string
  drum_life: CMYKValues
  toner_life: CMYKValues
}

const EMPTY_CMYK: CMYKValues = { c: null, m: null, y: null, k: null }
const CMYK_CHANNELS: CMYKChannel[] = ['c', 'm', 'y', 'k']

const EMPTY_SPECS: SpecFields = {
  readiness: null,
  country: null,
  meter_black: null,
  meter_colour: null,
  cassettes: null,
  internal_finisher: '',
  drum_life: EMPTY_CMYK,
  toner_life: EMPTY_CMYK,
}

function NumberInput(
  { value, onChange, className }:
  { value: number | null; onChange: (v: number | null) => void; className?: string }
) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value ?? ''}
      onChange={e => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = Number(raw)
        onChange(isNaN(n) ? null : n)
      }}
      placeholder="0"
      className={className}
    />
  )
}

function ReadOnlyInt({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`border-input bg-muted/50 flex h-9 items-center rounded-md border px-3 tabular-nums ${className ?? ''}`}>
      {value}
    </div>
  )
}

export function EditSpecsModal({ open, onOpenChange, assetDetails, accessories }: EditSpecsModalProps) {
  const updateAssetSpecs = useAssetStore(state => state.updateAssetSpecs)
  const coreFunctions = useReferenceDataStore(state => state.coreFunctions)
  const readinesses = useReferenceDataStore(state => state.readinesses)
  const countries = useReferenceDataStore(state => state.countries)

  const [fields, setFields] = useState<SpecFields>(EMPTY_SPECS)
  const [selectedFunctions, setSelectedFunctions] = useState<CoreFunction[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && assetDetails) {
      const { specs } = assetDetails
      setFields({
        readiness: readinesses.find(r => r.status === assetDetails.readiness) ?? null,
        country: countries.find(c => c.name === assetDetails.country_of_origin) ?? null,
        meter_black: specs.meter_black,
        meter_colour: specs.meter_colour,
        cassettes: specs.cassettes,
        internal_finisher: specs.internal_finisher ?? '',
        drum_life: {
          c: specs.drum_life_c,
          m: specs.drum_life_m,
          y: specs.drum_life_y,
          k: specs.drum_life_k,
        },
        toner_life: {
          c: specs.toner_life_c,
          m: specs.toner_life_m,
          y: specs.toner_life_y,
          k: specs.toner_life_k,
        },
      })
      setSelectedFunctions(coreFunctions.filter(cf => accessories.includes(cf.accessory)))
    }
  }, [open])

  if (!assetDetails) return null

  const meterTotal = (fields.meter_black ?? 0) + (fields.meter_colour ?? 0)

  function setReadiness(v: Status | null) { setFields(prev => ({ ...prev, readiness: v })) }
  function setCountry(v: Country | null) { setFields(prev => ({ ...prev, country: v })) }
  function setMeterBlack(v: number | null) { setFields(prev => ({ ...prev, meter_black: v })) }
  function setMeterColour(v: number | null) { setFields(prev => ({ ...prev, meter_colour: v })) }
  function setCassettes(v: number | null) { setFields(prev => ({ ...prev, cassettes: v })) }
  function setFinisher(v: string) { setFields(prev => ({ ...prev, internal_finisher: v })) }
  function setCMYK(key: 'drum_life' | 'toner_life', channel: CMYKChannel, value: number | null) {
    setFields(prev => ({ ...prev, [key]: { ...prev[key], [channel]: value } }))
  }

  const coreFunctionOptions = coreFunctions.map(cf => ({ id: cf.id, label: cf.accessory, value: cf.accessory }))
  const selectedOptions = selectedFunctions.map(cf => ({ id: cf.id, label: cf.accessory, value: cf.accessory }))

  async function handleSave() {
    if (!fields.readiness) {
      toast.error('Readiness is required.', { position: 'top-center' })
      return
    }
    setSaving(true)
    try {
      await updateAssetSpecs(assetDetails!.barcode, {
        readiness_id: fields.readiness.id,
        country_of_origin_id: fields.country?.id ?? null,
        cassettes: fields.cassettes,
        internal_finisher: fields.internal_finisher || null,
        meter_black: fields.meter_black,
        meter_colour: fields.meter_colour,
        drum_life_c: fields.drum_life.c,
        drum_life_m: fields.drum_life.m,
        drum_life_y: fields.drum_life.y,
        drum_life_k: fields.drum_life.k,
        toner_life_c: fields.toner_life.c,
        toner_life_m: fields.toner_life.m,
        toner_life_y: fields.toner_life.y,
        toner_life_k: fields.toner_life.k,
        accessory_names: selectedFunctions.map(cf => cf.accessory),
      })
      toast.success('Specifications updated.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[624px]">
        <DialogHeader>
          <DialogTitle>Edit Technical Specifications</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">

          <div className="flex flex-col gap-2">
            <HorizontalField label="Readiness" required>
              <ReadinessPicker
                selection={fields.readiness}
                onChange={setReadiness}
                options={readinesses}
                error={!fields.readiness}
              />
            </HorizontalField>
            <HorizontalField label="Country of Origin">
              <PopoverSearchInline
                selection={fields.country}
                onSelectionChange={setCountry}
                onClear={() => setCountry(null)}
                options={countries}
                searchKey="name"
                getLabel={(c: Country) => formatSentenceCase(c.name)}
                fieldLabel="Country of Origin"
                fieldRequired={false}
                placeholder=""
              />
            </HorizontalField>
          </div>

          <FormSection title="Usage">
            <div className="flex flex-col gap-2">
              <HorizontalField label="Meter — Black">
                <NumberInput value={fields.meter_black} onChange={setMeterBlack} className="max-w-[180px]" />
              </HorizontalField>
              <HorizontalField label="Meter — Colour">
                <NumberInput value={fields.meter_colour} onChange={setMeterColour} className="max-w-[180px]" />
              </HorizontalField>
              <HorizontalField label="Total">
                <ReadOnlyInt value={meterTotal} className="max-w-[180px]" />
              </HorizontalField>
            </div>
          </FormSection>

          <FormSection title="Consumables">
            <ConsumablesGrid>
              <ConsumablesRow label="Drum life">
                {CMYK_CHANNELS.map(ch => (
                  <ConsumablesCell
                    key={ch}
                    value={fields.drum_life[ch]}
                    onChange={v => setCMYK('drum_life', ch, v)}
                    ariaLabel={`Drum life ${ch.toUpperCase()}`}
                  />
                ))}
              </ConsumablesRow>
              <ConsumablesRow label="Toner">
                {CMYK_CHANNELS.map(ch => (
                  <ConsumablesCell
                    key={ch}
                    value={fields.toner_life[ch]}
                    onChange={v => setCMYK('toner_life', ch, v)}
                    ariaLabel={`Toner ${ch.toUpperCase()}`}
                  />
                ))}
              </ConsumablesRow>
            </ConsumablesGrid>
          </FormSection>

          <FormSection title="Hardware">
            <div className="flex flex-col gap-2">
              <HorizontalField label="Cassettes">
                <NumberInput value={fields.cassettes} onChange={setCassettes} className="max-w-[100px]" />
              </HorizontalField>
              <HorizontalField label="Internal Finisher">
                <Input
                  value={fields.internal_finisher}
                  onChange={e => setFinisher(e.target.value)}
                  placeholder="—"
                  className="max-w-[140px]"
                />
              </HorizontalField>
              <HorizontalField label="Core Functions">
                <MultipleSelector
                  options={coreFunctionOptions}
                  value={selectedOptions}
                  onChange={options =>
                    setSelectedFunctions(coreFunctions.filter(cf => options.some(o => o.id === cf.id)))
                  }
                  placeholder="Select functions…"
                  emptyIndicator={<p>No results found.</p>}
                />
              </HorizontalField>
            </div>
          </FormSection>

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
