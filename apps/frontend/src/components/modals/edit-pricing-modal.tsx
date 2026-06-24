import { FormSection } from "@/components/custom/form-section"
import { HorizontalField } from "@/components/custom/horizontal-field"
import { UnsavedChangesDialog } from "@/components/custom/unsaved-changes-dialog"
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
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard"
import { formatUSD } from "@/lib/formatters"
import { CircleNotchIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
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

function toPricingFields(assetDetails: AssetDetails | null): PricingFields {
  if (!assetDetails) return EMPTY_PRICING
  const { cost } = assetDetails
  return {
    purchase_cost: cost.purchase_cost?.toString() ?? '',
    transport_cost: cost.transport_cost?.toString() ?? '',
    processing_cost: cost.processing_cost?.toString() ?? '',
    other_cost: cost.other_cost?.toString() ?? '',
    parts_cost: cost.parts_cost?.toString() ?? '',
    sale_price: cost.sale_price?.toString() ?? '',
  }
}

function sanitize(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '')
  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}

function toNum(value: string | undefined): number {
  return parseFloat(value ?? '') || 0
}

function PriceField(
  { control, name, label }:
  { control: Control<PricingFields>; name: keyof PricingFields; label: string }
) {
  return (
    <HorizontalField label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className={`relative ${INPUT_WIDTH}`}>
            <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">$</span>
            <Input
              value={field.value}
              onChange={e => field.onChange(sanitize(e.target.value))}
              inputMode="decimal"
              placeholder="0.00"
              className="pl-7 tabular-nums"
            />
          </div>
        )}
      />
    </HorizontalField>
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

  const values = useMemo(() => toPricingFields(assetDetails), [assetDetails])
  const form = useForm<PricingFields>({ values })
  const isSubmitting = form.formState.isSubmitting

  const guard = useUnsavedChangesGuard(
    form.formState.isDirty,
    onOpenChange,
    () => form.reset(),
  )

  const watched = useWatch({ control: form.control })
  const totalCost =
    toNum(watched.purchase_cost) +
    toNum(watched.transport_cost) +
    toNum(watched.processing_cost) +
    toNum(watched.other_cost) +
    toNum(watched.parts_cost)

  if (!assetDetails) return null

  async function onValid(fields: PricingFields) {
    try {
      await updateAssetPricing(assetDetails!.barcode, {
        purchase_cost: toNum(fields.purchase_cost),
        transport_cost: toNum(fields.transport_cost),
        processing_cost: toNum(fields.processing_cost),
        other_cost: toNum(fields.other_cost),
        parts_cost: toNum(fields.parts_cost),
        sale_price: toNum(fields.sale_price),
      })
      form.reset(fields)
      toast.success('Pricing updated.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  function handleSave() {
    form.handleSubmit(onValid)()
  }

  return (
    <Dialog open={open} onOpenChange={guard.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Asset Pricing</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6">

          <FormSection title="Costs">
            <div className="flex flex-col gap-2">
              <PriceField control={form.control} name="purchase_cost" label="Purchase" />
              <PriceField control={form.control} name="transport_cost" label="Transport" />
              <PriceField control={form.control} name="processing_cost" label="Processing" />
              <PriceField control={form.control} name="parts_cost" label="Parts" />
              <PriceField control={form.control} name="other_cost" label="Other" />
              <HorizontalField label="Total">
                <ReadOnlyPrice value={totalCost} />
              </HorizontalField>
            </div>
          </FormSection>

          <FormSection title="Sale">
            <PriceField control={form.control} name="sale_price" label="Sale Price" />
          </FormSection>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => guard.onOpenChange(false)} type="button" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={isSubmitting}>
            {isSubmitting ? <><CircleNotchIcon className="animate-spin" />Saving...</> : 'Save'}
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
