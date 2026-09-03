import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { FormSection } from '@/components/asset-details/form-section'
import { HorizontalField } from '@/components/shared/horizontal-field'
import { PriceInput } from '@/components/shared/price-input'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useAssetStore } from '@/data/store/asset-store'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { ASSET_PRICING_FIELDS, COST_FIELD_LABELS, type CostFieldId } from '@/lib/cost-fields'
import { formatUSD } from '@/lib/formatters'
import { DISCARD_USER_EDITS, KEEP_USER_EDITS_ON_SERVER_REFRESH } from '@/lib/form-reset-options'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import { Controller, useForm, useWatch, type Control } from 'react-hook-form'
import {
  COST_COMPONENT_FIELDS,
  totalCostFromComponents,
  type AssetDetails,
  type UpdateAssetPricing,
} from 'shared-types'
import { toast } from 'sonner'

interface EditPricingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetDetails: AssetDetails | null
}

type PricingFields = Record<CostFieldId, string>

function mapPricingFields(read: (field: CostFieldId) => string): PricingFields {
  return Object.fromEntries(ASSET_PRICING_FIELDS.map((f) => [f, read(f)])) as PricingFields
}

const EMPTY_PRICING: PricingFields = mapPricingFields(() => '')

const INPUT_WIDTH = 'max-w-[160px]'

function toPricingFields(assetDetails: AssetDetails | null): PricingFields {
  if (!assetDetails) return EMPTY_PRICING
  const { cost } = assetDetails
  return mapPricingFields((field) => cost[field]?.toString() ?? '')
}

function toNum(value: string | undefined): number {
  return parseFloat(value ?? '') || 0
}

function PriceField({
  control,
  name,
  label,
}: {
  control: Control<PricingFields>
  name: keyof PricingFields
  label: string
}) {
  return (
    <HorizontalField label={label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <PriceInput
            value={field.value}
            onChange={field.onChange}
            label={label}
            className={INPUT_WIDTH}
          />
        )}
      />
    </HorizontalField>
  )
}

function ReadOnlyPrice({ value }: { value: number }) {
  return (
    <div className={`relative ${INPUT_WIDTH}`}>
      <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        $
      </span>
      <div className="border-input bg-muted/50 flex h-9 items-center rounded-md border pl-7 pr-3 tabular-nums">
        {formatUSD(value)}
      </div>
    </div>
  )
}

export function EditPricingModal({ open, onOpenChange, assetDetails }: EditPricingModalProps) {
  const updateAssetPricing = useAssetStore((state) => state.updateAssetPricing)

  const values = useMemo(() => toPricingFields(assetDetails), [assetDetails])
  const form = useForm<PricingFields>({
    values,
    resetOptions: KEEP_USER_EDITS_ON_SERVER_REFRESH,
  })
  const isSubmitting = form.formState.isSubmitting

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () =>
    form.reset(undefined, DISCARD_USER_EDITS),
  )

  const watched = useWatch({ control: form.control })
  const totalCost = totalCostFromComponents(
    Object.fromEntries(COST_COMPONENT_FIELDS.map((f) => [f, toNum(watched[f])])),
  )

  if (!assetDetails) return null

  async function onValid(fields: PricingFields) {
    try {
      await updateAssetPricing(
        assetDetails!.barcode,
        Object.fromEntries(
          ASSET_PRICING_FIELDS.map((f) => [f, toNum(fields[f])]),
        ) as UpdateAssetPricing,
      )
      form.reset(fields, DISCARD_USER_EDITS)
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
              {COST_COMPONENT_FIELDS.map((field) => (
                <PriceField
                  key={field}
                  control={form.control}
                  name={field}
                  label={COST_FIELD_LABELS[field]}
                />
              ))}
              <HorizontalField label="Total">
                <ReadOnlyPrice value={totalCost} />
              </HorizontalField>
            </div>
          </FormSection>

          <FormSection title="Sale">
            <PriceField
              control={form.control}
              name="sale_price"
              label={COST_FIELD_LABELS.sale_price}
            />
          </FormSection>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => guard.onOpenChange(false)}
            type="button"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} type="button" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <CircleNotchIcon className="animate-spin" />
                Saving...
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
