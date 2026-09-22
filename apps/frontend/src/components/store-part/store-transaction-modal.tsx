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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/shadcn/input-group'
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
import { CircleNotchIcon, XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Controller, useForm, useWatch, type Control, type FieldErrors } from 'react-hook-form'
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

type StoreTransactionFormBodyProps = Omit<StoreTransactionModalProps, 'open'>

function PartField({
  lockedPart,
  creatingPart,
  control,
  kind,
  allParts,
  partQuery,
  onQueryChange,
  onCreatePart,
  onCancelNewPart,
}: {
  lockedPart: StorePart | undefined
  creatingPart: boolean
  control: Control<StoreTransactionForm>
  kind: StoreTransactionKind
  allParts: StorePart[]
  partQuery: string
  onQueryChange: (query: string) => void
  onCreatePart: (partNumber: string) => void
  onCancelNewPart: () => void
}) {
  if (lockedPart) {
    return <span className="font-mono text-sm">{lockedPart.part_number}</span>
  }
  if (creatingPart) {
    return <NewPartNumberField control={control} onCancel={onCancelNewPart} />
  }
  return (
    <ExistingPartSearch
      control={control}
      kind={kind}
      allParts={allParts}
      partQuery={partQuery}
      onQueryChange={onQueryChange}
      onCreatePart={onCreatePart}
    />
  )
}

function NewPartNumberField({
  control,
  onCancel,
}: {
  control: Control<StoreTransactionForm>
  onCancel: () => void
}) {
  return (
    <Controller
      control={control}
      name="newPart.part_number"
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <InputGroup>
            <InputGroupInput
              {...field}
              placeholder="Part number"
              autoComplete="off"
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-sm"
                onClick={onCancel}
                type="button"
                aria-label="Cancel new part"
              >
                <XIcon aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
        </div>
      )}
    />
  )
}

function NewPartDescriptionField({ control }: { control: Control<StoreTransactionForm> }) {
  return (
    <Controller
      control={control}
      name="newPart.description"
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <Input {...field} placeholder="Part description" aria-invalid={fieldState.invalid} />
          <FieldError errors={fieldState.error ? [fieldState.error] : []} />
        </div>
      )}
    />
  )
}

function ExistingPartSearch({
  control,
  kind,
  allParts,
  partQuery,
  onQueryChange,
  onCreatePart,
}: {
  control: Control<StoreTransactionForm>
  kind: StoreTransactionKind
  allParts: StorePart[]
  partQuery: string
  onQueryChange: (query: string) => void
  onCreatePart: (partNumber: string) => void
}) {
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
                    onCreatePart(query)
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
  ...bodyProps
}: StoreTransactionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <StoreTransactionFormBody onOpenChange={onOpenChange} {...bodyProps} />
      </DialogContent>
    </Dialog>
  )
}

function StoreTransactionFormBody({
  onOpenChange,
  warehouseId,
  warehouseLabel,
  allParts,
  lockedPart,
  onHandByPartId,
}: StoreTransactionFormBodyProps) {
  const { recordStoreTransaction } = useStorePartMutations()
  const [partQuery, setPartQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit, setValue, clearErrors } = useForm<StoreTransactionForm>({
    resolver: zodResolver(StoreTransactionFormSchema),
    defaultValues: lockedPart
      ? { ...EMPTY_STORE_TRANSACTION_FORM, part: lockedPart }
      : EMPTY_STORE_TRANSACTION_FORM,
  })

  const kind = useWatch({ control, name: 'kind' })
  const part = useWatch({ control, name: 'part' })
  const newPart = useWatch({ control, name: 'newPart' })
  const quantity = useWatch({ control, name: 'quantity' })

  const creatingPart = newPart !== null
  const onHand = part === null ? null : (onHandByPartId[part.id] ?? 0)
  const overStock =
    kind === 'SALE' && onHand !== null && /^\d+$/.test(quantity) && Number(quantity) > onHand

  function handleKindChange(next: string) {
    const picked = KIND_OPTIONS.find((o) => o.value === next)?.value
    if (!picked) return
    // A SALE cannot create a new part — drop any in-progress new part.
    if (picked === 'SALE' && creatingPart) setValue('newPart', null, { shouldValidate: true })
    setValue('kind', picked, { shouldValidate: true })
  }

  function handleCreatePart(partNumber: string) {
    setValue('part', null)
    setValue('newPart', { part_number: partNumber, description: '' })
    clearErrors('part')
  }

  function handleCancelNewPart() {
    setValue('newPart', null)
    clearErrors('newPart')
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
      formErrors.newPart?.part_number?.message ??
      formErrors.newPart?.description?.message ??
      formErrors.quantity?.message ??
      'Please fix the highlighted fields'
    toast.error(message, { position: 'top-center' })
  }

  return (
    <>
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
            creatingPart={creatingPart}
            control={control}
            kind={kind}
            allParts={allParts}
            partQuery={partQuery}
            onQueryChange={setPartQuery}
            onCreatePart={handleCreatePart}
            onCancelNewPart={handleCancelNewPart}
          />
        </HorizontalField>

        {creatingPart && (
          <HorizontalField label="Description" required>
            <NewPartDescriptionField control={control} />
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
    </>
  )
}
