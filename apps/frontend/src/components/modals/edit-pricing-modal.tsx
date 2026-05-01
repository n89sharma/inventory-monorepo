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

function sanitize(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

function toNum(value: string): number {
  return parseFloat(value) || 0
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
        <Input
          value={value}
          onChange={onChange}
          inputMode="decimal"
          placeholder="0.00"
          className="pl-7"
        />
      </div>
    </div>
  )
}

function ReadOnlyPrice({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
        <div className="border-input bg-muted/50 flex h-9 items-center rounded-md border pl-7 pr-3 text-sm">
          {formatUSD(value)}
        </div>
      </div>
    </div>
  )
}

export function EditPricingModal({ open, onOpenChange, assetDetails }: EditPricingModalProps) {
  const updateAssetPricing = useAssetStore(state => state.updateAssetPricing)

  const [fields, setFields] = useState<PricingFields>({
    purchase_cost: '',
    transport_cost: '',
    processing_cost: '',
    other_cost: '',
    parts_cost: '',
    sale_price: '',
  })
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
    const response = await updateAssetPricing(assetDetails!.barcode, {
      purchase_cost: toNum(fields.purchase_cost),
      transport_cost: toNum(fields.transport_cost),
      processing_cost: toNum(fields.processing_cost),
      other_cost: toNum(fields.other_cost),
      parts_cost: toNum(fields.parts_cost),
      sale_price: toNum(fields.sale_price),
    })
    setSaving(false)
    if (response.success) {
      toast.success('Pricing updated.')
      onOpenChange(false)
    } else {
      toast.error(response.error.summary)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Asset Pricing</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <PriceInput label="Purchase Cost" value={fields.purchase_cost} onChange={setField('purchase_cost')} />
          <PriceInput label="Other Cost" value={fields.other_cost} onChange={setField('other_cost')} />

          <PriceInput label="Transport Cost" value={fields.transport_cost} onChange={setField('transport_cost')} />
          <PriceInput label="Parts Cost" value={fields.parts_cost} onChange={setField('parts_cost')} />

          <PriceInput label="Processing Cost" value={fields.processing_cost} onChange={setField('processing_cost')} />
          <ReadOnlyPrice label="Total Cost" value={totalCost} />

          <div />
          <PriceInput label="Sale Price" value={fields.sale_price} onChange={setField('sale_price')} />
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
