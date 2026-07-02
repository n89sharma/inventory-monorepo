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
import { SearchSelectInput } from '@/components/shared/search-select/search-select-input'
import { useStorePartMutations } from '@/hooks/use-store-part-mutations'
import {
  AddPurchaseFormSchema,
  EMPTY_ADD_PURCHASE_FORM,
  type AddPurchaseForm,
} from '@/ui-types/store-part-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotchIcon } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import type { StorePart } from 'shared-types'
import { toast } from 'sonner'

interface AddPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warehouseId: number
  warehouseLabel: string
  allParts: StorePart[]
  lockedPart?: StorePart
}

function isNewPart(part: AddPurchaseForm['part']): boolean {
  return part !== null && !('id' in part)
}

export function AddPurchaseModal({
  open,
  onOpenChange,
  warehouseId,
  warehouseLabel,
  allParts,
  lockedPart,
}: AddPurchaseModalProps) {
  const { addPurchase } = useStorePartMutations()
  const [partQuery, setPartQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit, reset, setValue, watch } = useForm<AddPurchaseForm>({
    resolver: zodResolver(AddPurchaseFormSchema),
    defaultValues: EMPTY_ADD_PURCHASE_FORM,
  })

  useEffect(() => {
    if (open) {
      reset(lockedPart ? { ...EMPTY_ADD_PURCHASE_FORM, part: lockedPart } : EMPTY_ADD_PURCHASE_FORM)
      setPartQuery('')
    }
  }, [open, lockedPart, reset])

  const part = watch('part')

  async function onValid(values: AddPurchaseForm) {
    setSaving(true)
    try {
      await addPurchase(warehouseId, values)
      toast.success('Purchase added.', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // axios interceptor already surfaced the error toast
    }
    setSaving(false)
  }

  function onInvalid(formErrors: FieldErrors<AddPurchaseForm>) {
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
          <DialogTitle>Add Purchase</DialogTitle>
        </DialogHeader>

        <form
          id="add-purchase-form"
          onSubmit={handleSubmit(onValid, onInvalid)}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1"
        >
          <HorizontalField label="Warehouse">
            <span className="text-sm">{warehouseLabel}</span>
          </HorizontalField>

          <HorizontalField label="Part" required>
            {lockedPart ? (
              <span className="font-mono text-sm">{lockedPart.part_number}</span>
            ) : (
              <Controller
                control={control}
                name="part"
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1">
                    <SearchSelectInput
                      selection={field.value}
                      query={partQuery}
                      onQueryChange={setPartQuery}
                      onSelectionChange={(value) => {
                        field.onChange(value)
                        setPartQuery('')
                      }}
                      onClear={() => {
                        field.onChange(null)
                        setPartQuery('')
                      }}
                      onCreateOption={(query) => {
                        field.onChange({ part_number: query, description: '' })
                        setPartQuery('')
                      }}
                      createLabel={(query) => `Create part "${query}"`}
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
            )}
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
          </HorizontalField>

          <HorizontalField label="Unit cost">
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
          <Button type="submit" form="add-purchase-form" disabled={saving}>
            {saving ? (
              <>
                <CircleNotchIcon className="animate-spin" />
                Adding...
              </>
            ) : (
              'Add Part'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
