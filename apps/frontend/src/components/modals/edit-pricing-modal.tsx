import { FormSection } from "@/components/custom/form-section"
import { HorizontalField } from "@/components/custom/horizontal-field"
import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog"
import { Input } from "@/components/shadcn/input"
import { useAssetStore } from "@/data/store/asset-store"
import { formatUSD } from "@/lib/formatters"
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import type { AssetDetails } from "shared-types"
import { toast } from "sonner"

interface EditPricingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
}

interface PricingFields {
  purchase_cost: string
  transport_cost: string
  processing_cost: string
  other_cost: string
  parts_cost: string
  sale_price: string
}

const EMPTY_PRICING: PricingFields = {
  purchase_cost: '',
  transport_cost: '',
  processing_cost: '',
  other_cost: '',
  parts_cost: '',
  sale_price: '',
}

const INPUT_WIDTH = 'max-w-[160px]'

function sanitize(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

function toNum(value: string): number {
  return parseFloat(value) || 0
}

function PriceInput(
  { value, onChange }:
  { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }
) {
  return (
    <div className={`relative ${INPUT_WIDTH}`}>
      <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">$</span>
      <Input
        value={value}
        onChange={onChange}
        inputMode="decimal"
        placeholder="0.00"
        className="pl-7 tabular-nums"
      />
    </div>
  )
}

function ReadOnlyPrice({ value }: { value: number }) {
  return (
    <div className={`relative ${INPUT_WIDTH}`}>
      <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">$</span>
      <div className="border-input bg-muted/50 flex h-9 items-center rounded-md border pl-7 pr-3 tabular-nums">
        {formatUSD(value)}
      </div>
    </div>
  )
}

export function EditPricingModal({ open, onOpenChange, assetDetails }: EditPricingModalProps) {
  const updateAssetPricing = useAssetStore(state => state.updateAssetPricing)

  const [fields, setFields] = useState<PricingFields>(EMPTY_PRICING)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && assetDetails) {
      const { cost } = assetDetails
      setFields({
        purchase_cost: cost.purchase_cost?.toString() ?? '',
        transport_cost: cost.transport_cost?.toString() ?? '',
        processing_cost: cost.processing_cost?.toString() ?? '',
        other_cost: cost.other_cost?.toString() ?? '',
        parts_cost: cost.parts_cost?.toString() ?? '',
        sale_price: cost.sale_price?.toString() ?? '',
      })
    }
  }, [open])

  if (!assetDetails) return null

  const totalCost =
    toNum(fields.purchase_cost) +
    toNum(fields.transport_cost) +
    toNum(fields.processing_cost) +
    toNum(fields.other_cost) +
    toNum(fields.parts_cost)

  function setField(key: keyof PricingFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: sanitize(e.target.value) }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateAssetPricing(assetDetails!.barcode, {
        purchase_cost: toNum(fields.purchase_cost),
        transport_cost: toNum(fields.transport_cost),
        processing_cost: toNum(fields.processing_cost),
        other_cost: toNum(fields.other_cost),
        parts_cost: toNum(fields.parts_cost),
        sale_price: toNum(fields.sale_price),
      })
      toast.success('Pricing updated.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Asset Pricing</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">

          <FormSection title="Costs">
            <div className="flex flex-col gap-2">
              <HorizontalField label="Purchase">
                <PriceInput value={fields.purchase_cost} onChange={setField('purchase_cost')} />
              </HorizontalField>
              <HorizontalField label="Transport">
                <PriceInput value={fields.transport_cost} onChange={setField('transport_cost')} />
              </HorizontalField>
              <HorizontalField label="Processing">
                <PriceInput value={fields.processing_cost} onChange={setField('processing_cost')} />
              </HorizontalField>
              <HorizontalField label="Parts">
                <PriceInput value={fields.parts_cost} onChange={setField('parts_cost')} />
              </HorizontalField>
              <HorizontalField label="Other">
                <PriceInput value={fields.other_cost} onChange={setField('other_cost')} />
              </HorizontalField>
              <HorizontalField label="Total">
                <ReadOnlyPrice value={totalCost} />
              </HorizontalField>
            </div>
          </FormSection>

          <FormSection title="Sale">
            <HorizontalField label="Sale Price">
              <PriceInput value={fields.sale_price} onChange={setField('sale_price')} />
            </HorizontalField>
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
