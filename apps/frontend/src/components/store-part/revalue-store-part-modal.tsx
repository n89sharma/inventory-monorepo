import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { FieldError } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { Textarea } from '@/components/shadcn/textarea'
import { HorizontalField } from '@/components/shared/horizontal-field'
import { useStorePartMutations } from '@/hooks/use-store-part-mutations'
import { formatUSDWithSymbol } from '@/lib/formatters'
import {
  RevalueStorePartFormSchema,
  EMPTY_REVALUE_STORE_PART_FORM,
  type RevalueStorePartForm,
} from '@/ui-types/store-part-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'

const TITLE = 'Revalue Stock'
const SUCCESS_MESSAGE = 'Stock revalued.'
const REDACTED_PRICE = '—'

interface RevalueStorePartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partId: number
  partNumber: string
  warehouseId: number
  warehouseLabel: string
  onHand: number
  // What the stock on hand is carried at per unit; null for callers who cannot see costs.
  currentUnitPrice: number | null
}

type RevalueStorePartFormBodyProps = Omit<RevalueStorePartModalProps, 'open'>

export function RevalueStorePartModal({
  open,
  onOpenChange,
  ...bodyProps
}: RevalueStorePartModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <RevalueStorePartFormBody onOpenChange={onOpenChange} {...bodyProps} />
      </DialogContent>
    </Dialog>
  )
}

function RevalueStorePartFormBody({
  onOpenChange,
  partId,
  partNumber,
  warehouseId,
  warehouseLabel,
  onHand,
  currentUnitPrice,
}: RevalueStorePartFormBodyProps) {
  const { revalueStorePart } = useStorePartMutations()
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit } = useForm<RevalueStorePartForm>({
    resolver: zodResolver(RevalueStorePartFormSchema),
    defaultValues: EMPTY_REVALUE_STORE_PART_FORM,
  })

  async function onValid(values: RevalueStorePartForm) {
    setSaving(true)
    try {
      await revalueStorePart(partId, warehouseId, values)
      toast.success(SUCCESS_MESSAGE, { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // axios interceptor already surfaced the error toast
    }
    setSaving(false)
  }

  function onInvalid(formErrors: FieldErrors<RevalueStorePartForm>) {
    toast.error(formErrors.unitPrice?.message ?? 'Please fix the highlighted fields', {
      position: 'top-center',
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{TITLE}</DialogTitle>
      </DialogHeader>

      <form
        id="revalue-store-part-form"
        onSubmit={handleSubmit(onValid, onInvalid)}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1"
      >
        <HorizontalField label="Part">
          <span className="font-mono text-sm">{partNumber}</span>
        </HorizontalField>

        <HorizontalField label="Warehouse">
          <span className="text-sm">{warehouseLabel}</span>
        </HorizontalField>

        <HorizontalField label="On hand">
          <span className="text-sm tabular-nums">{onHand}</span>
        </HorizontalField>

        <HorizontalField label="Current unit">
          <span className="text-sm tabular-nums">
            {currentUnitPrice === null ? REDACTED_PRICE : formatUSDWithSymbol(currentUnitPrice)}
          </span>
        </HorizontalField>

        <HorizontalField label="New unit" required>
          <Controller
            control={control}
            name="unitPrice"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <div className="relative max-w-[160px]">
                  <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0.00"
                    aria-invalid={fieldState.invalid}
                    className="pl-7 tabular-nums"
                  />
                </div>
                <FieldError errors={fieldState.error ? [fieldState.error] : []} />
              </div>
            )}
          />
        </HorizontalField>

        <HorizontalField label="Notes">
          <Controller
            control={control}
            name="notes"
            render={({ field }) => <Textarea {...field} placeholder="Optional" rows={2} />}
          />
        </HorizontalField>
      </form>

      <DialogFooter>
        <Button
          variant="outline"
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" form="revalue-store-part-form" disabled={saving}>
          {saving ? (
            <>
              <CircleNotchIcon className="animate-spin" />
              Saving...
            </>
          ) : (
            TITLE
          )}
        </Button>
      </DialogFooter>
    </>
  )
}
