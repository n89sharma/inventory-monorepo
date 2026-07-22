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
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { HorizontalField } from '@/components/shared/horizontal-field'
import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useStorePartMutations } from '@/hooks/use-store-part-mutations'
import {
  StoreTransactionFormSchema,
  EMPTY_STORE_TRANSACTION_FORM,
  type StoreTransactionForm,
} from '@/ui-types/store-part-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Controller, useForm, type Control, type FieldErrors } from 'react-hook-form'
import type { StorePart, StoreTransactionKind } from 'shared-types'
import { toast } from 'sonner'

const KIND_OPTIONS = [
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'SALE', label: 'Sale' },
] as const satisfies readonly { value: StoreTransactionKind; label: string }[]

const TITLE_BY_KIND = {
  PURCHASE: 'Add Purchase',
  SALE: 'Record Sale',
} as const satisfies Record<StoreTransactionKind, string>

const SUCCESS_BY_KIND = {
  PURCHASE: 'Purchase added.',
  SALE: 'Sale recorded.',
} as const satisfies Record<StoreTransactionKind, string>

const MONEY_LABEL_BY_KIND = {
  PURCHASE: 'Unit cost',
  SALE: 'Unit price',
} as const satisfies Record<StoreTransactionKind, string>

interface StoreTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouseId: number
  warehouseLabel: string
  allParts: StorePart[]
  lockedPart?: StorePart
  // On-hand for this warehouse, keyed by part id — used to guard a SALE against overselling.
  onHandByPartId: Record<number, number>
}

function isNewPart(part: StoreTransactionForm['part']): boolean {
  return part !== null && !('id' in part)
}

function PartField({
  lockedPart,
  control,
  kind,
  allParts,
  partQuery,
  onQueryChange,
}: {
  lockedPart: StorePart | undefined
  control: Control<StoreTransactionForm>
  kind: StoreTransactionKind
  allParts: StorePart[]
  partQuery: string
  onQueryChange: (query: string) => void
}) {
  if (lockedPart) {
    return <span className="font-mono text-sm">{lockedPart.part_number}</span>
  }
  return (
    <Controller
      control={control}
      name="part"
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <SearchSelectInput
            selection={field.value}
            query={partQuery}
            onQueryChange={onQueryChange}
            onSelectionChange={(value) => {
              field.onChange(value)
              onQueryChange('')
            }}
            onClear={() => {
              field.onChange(null)
              onQueryChange('')
            }}
            onCreateOption={
              kind === 'PURCHASE'
                ? (query) => {
                    field.onChange({ part_number: query, description: '' })
                    onQueryChange('')
                  }
                : undefined
            }
            createLabel={kind === 'PURCHASE' ? (query) => `Create part "${query}"` : undefined}
            options={allParts}
            getLabel={(p) => p.part_number}
            placeholder="Search part number or description"
            clearLabel="Clear part"
            error={fieldState.invalid}
          />
          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
        </div>
      )}
    />
  )
}

export function StoreTransactionModal({
  open,
  onOpenChange,
  warehouseId,
  warehouseLabel,
  allParts,
  lockedPart,
  onHandByPartId,
}: StoreTransactionModalProps) {
  const { recordStoreTransaction } = useStorePartMutations()
  const [partQuery, setPartQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit, reset, setValue, watch } = useForm<StoreTransactionForm>({
    resolver: zodResolver(StoreTransactionFormSchema),
    defaultValues: EMPTY_STORE_TRANSACTION_FORM,
  })

  useEffect(() => {
    if (open) {
      reset(
        lockedPart
          ? { ...EMPTY_STORE_TRANSACTION_FORM, part: lockedPart }
          : EMPTY_STORE_TRANSACTION_FORM,
      )
      setPartQuery('')
    }
  }, [open, lockedPart, reset])

  const kind = watch('kind')
  const part = watch('part')
  const quantity = watch('quantity')

  const selectedPartId = part !== null && 'id' in part ? part.id : null
  const onHand = selectedPartId === null ? null : (onHandByPartId[selectedPartId] ?? 0)
  const overStock =
    kind === 'SALE' && onHand !== null && /^\d+$/.test(quantity) && Number(quantity) > onHand

  function handleKindChange(next: string) {
    const picked = KIND_OPTIONS.find((o) => o.value === next)?.value
    if (!picked) return
    // A SALE cannot create a new part — drop any in-progress new part.
    if (picked === 'SALE' && isNewPart(part)) setValue('part', null, { shouldValidate: true })
    setValue('kind', picked, { shouldValidate: true })
  }

  async function onValid(values: StoreTransactionForm) {
    if (overStock) {
      toast.error('Quantity exceeds stock on hand', { position: 'top-center' })
      return
    }
    setSaving(true)
    try {
      await recordStoreTransaction(warehouseId, values)
      toast.success(SUCCESS_BY_KIND[values.kind], { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // axios interceptor already surfaced the error toast
    }
    setSaving(false)
  }

  function onInvalid(formErrors: FieldErrors<StoreTransactionForm>) {
    const message =
      formErrors.part?.message ??
      formErrors.quantity?.message ??
      'Please fix the highlighted fields'
    toast.error(message, { position: 'top-center' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{TITLE_BY_KIND[kind]}</DialogTitle>
        </DialogHeader>

        <form
          id="store-transaction-form"
          onSubmit={handleSubmit(onValid, onInvalid)}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1"
        >
          <HorizontalField label="Type" required>
            <ToggleGroup
              type="single"
              value={kind}
              onValueChange={handleKindChange}
              variant="outline"
              size="sm"
            >
              {KIND_OPTIONS.map((opt) => (
                <ToggleGroupItem key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </HorizontalField>

          <HorizontalField label="Warehouse">
            <span className="text-sm">{warehouseLabel}</span>
          </HorizontalField>

          <HorizontalField label="Part" required>
            <PartField
              lockedPart={lockedPart}
              control={control}
              kind={kind}
              allParts={allParts}
              partQuery={partQuery}
              onQueryChange={setPartQuery}
            />
          </HorizontalField>

          {isNewPart(part) && (
            <HorizontalField label="Description" required>
              <Input
                value={part && !('id' in part) ? part.description : ''}
                onChange={(e) => {
                  if (part && !('id' in part)) {
                    setValue(
                      'part',
                      { ...part, description: e.target.value },
                      { shouldValidate: true },
                    )
                  }
                }}
                placeholder="Part description"
              />
            </HorizontalField>
          )}

          <HorizontalField label="Quantity" required>
            <div className="flex flex-col gap-1">
              <Controller
                control={control}
                name="quantity"
                render={({ field }) => (
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="0"
                    className="max-w-[160px] tabular-nums"
                  />
                )}
              />
              {kind === 'SALE' && onHand !== null && (
                <span
                  className={`text-xs ${overStock ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  On hand: {onHand}
                </span>
              )}
            </div>
          </HorizontalField>

          <HorizontalField label={MONEY_LABEL_BY_KIND[kind]}>
            <Controller
              control={control}
              name="unitCost"
              render={({ field }) => (
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
                    className="pl-7 tabular-nums"
                  />
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
          <Button type="submit" form="store-transaction-form" disabled={saving || overStock}>
            {saving ? (
              <>
                <CircleNotchIcon className="animate-spin" />
                Saving...
              </>
            ) : (
              TITLE_BY_KIND[kind]
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
