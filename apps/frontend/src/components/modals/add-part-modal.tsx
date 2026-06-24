import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
import { HorizontalField } from '@/components/custom/horizontal-field'
import { SearchSelectInput } from '@/components/custom/search-select-input'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Field, FieldError, FieldLabel } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import { Textarea } from '@/components/shadcn/textarea'
import { Toggle } from '@/components/shadcn/toggle'
import { useAssetStore } from '@/data/store/asset-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useStorePartsList } from '@/hooks/use-store-part'
import { cn } from '@/lib/utils'
import {
  AddStorePartFormSchema,
  EMPTY_ADD_STORE_PART_FORM,
  type AddStorePartForm,
} from '@/ui-types/store-part-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, ArrowsLeftRightIcon, CircleNotchIcon, XIcon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { CreateSalvagedPartSchema, type CreateSalvagedPart, type Warehouse } from 'shared-types'
import { toast } from 'sonner'

interface AddPartModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientBarcode: string | null
}

// Floor the panel to the taller (Machine) tab so switching tabs never resizes the dialog.
const TAB_BODY_MIN_HEIGHT = 'min-h-80'

export function AddPartModal({ open, onOpenChange, recipientBarcode }: AddPartModalProps) {
  if (!recipientBarcode) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Part</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="machine" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="self-start">
            <TabsTrigger value="machine">Machine</TabsTrigger>
            <TabsTrigger value="store">Store</TabsTrigger>
          </TabsList>

          <TabsContent value="machine" className={cn('flex flex-1 flex-col', TAB_BODY_MIN_HEIGHT)}>
            <MachineTab
              recipientBarcode={recipientBarcode}
              open={open}
              onClose={() => onOpenChange(false)}
            />
          </TabsContent>

          <TabsContent value="store" className={cn('flex flex-1 flex-col', TAB_BODY_MIN_HEIGHT)}>
            <StoreTab
              recipientBarcode={recipientBarcode}
              open={open}
              onClose={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface TabProps {
  recipientBarcode: string
  open: boolean
  onClose: () => void
}

function MachineTab({ recipientBarcode, open, onClose }: TabProps) {
  const createAssetHarvestedPart = useAssetStore((state) => state.createAssetHarvestedPart)

  const form = useForm<CreateSalvagedPart>({
    resolver: zodResolver(CreateSalvagedPartSchema),
    defaultValues: { donor_barcode: '', part: '', is_exchange: false, notes: '' },
  })

  const { isSubmitting } = form.formState

  useEffect(() => {
    if (open) form.reset()
  }, [open, form])

  async function handleSave(data: CreateSalvagedPart) {
    if (data.donor_barcode === recipientBarcode) {
      form.setError('donor_barcode', { message: 'Donor and recipient cannot be the same asset' })
      return
    }
    try {
      await createAssetHarvestedPart(recipientBarcode, data)
      toast.success('Part transfer recorded.', { position: 'top-center' })
      onClose()
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2">
        <Field>
          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="donor_barcode"
              render={({ field, fieldState }) => (
                <div className="flex-1">
                  {field.value ? (
                    <div className="flex h-8 items-center gap-2 rounded-lg border bg-transparent pl-2.5 pr-1 text-sm">
                      <span className="font-mono flex-1">{field.value}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Clear donor asset"
                        onClick={() => field.onChange('')}
                        className="size-6"
                      >
                        <XIcon aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <AddAssetByBarcode
                      getAssets={() => []}
                      onAddAsset={(asset) => {
                        field.onChange(asset.barcode)
                        form.clearErrors('donor_barcode')
                      }}
                      entityName="part transfer"
                      validateAsset={(asset) =>
                        asset.barcode === recipientBarcode
                          ? 'Donor and recipient cannot be the same asset'
                          : null
                      }
                      showLeadingIcon
                    />
                  )}
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              )}
            />

            <Controller
              control={form.control}
              name="is_exchange"
              render={({ field }) => (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={field.value ? 'Switch to one-way transfer' : 'Switch to exchange'}
                  onClick={() => field.onChange(!field.value)}
                >
                  {field.value ? <ArrowsLeftRightIcon /> : <ArrowRightIcon />}
                </Button>
              )}
            />

            <div className="flex-1">
              <div className="flex h-8 items-center rounded-lg border bg-transparent px-2.5 text-sm">
                <span className="font-mono">{recipientBarcode}</span>
              </div>
            </div>
          </div>
          <Controller
            control={form.control}
            name="is_exchange"
            render={({ field }) => (
              <p className="text-center text-xs text-muted-foreground mt-1">
                {field.value ? 'Exchange' : 'One-way transfer'}
              </p>
            )}
          />
        </Field>

        <Controller
          control={form.control}
          name="part"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Part</FieldLabel>
              <Input
                {...field}
                placeholder="e.g. Drum Unit, Fuser Assembly…"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="notes"
          render={({ field }) => (
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea {...field} placeholder="Optional notes…" className="resize-none" />
            </Field>
          )}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} type="button" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={form.handleSubmit(handleSave)}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  )
}

function StoreTab({ recipientBarcode, open, onClose }: TabProps) {
  const addStorePartToAsset = useAssetStore((state) => state.addStorePartToAsset)
  const { data: allRows = [] } = useStorePartsList()
  const [partQuery, setPartQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const { control, handleSubmit, reset, setValue, watch } = useForm<AddStorePartForm>({
    resolver: zodResolver(AddStorePartFormSchema),
    defaultValues: EMPTY_ADD_STORE_PART_FORM,
  })

  useEffect(() => {
    if (open) {
      reset(EMPTY_ADD_STORE_PART_FORM)
      setPartQuery('')
    }
  }, [open, reset])

  const warehouse = watch('warehouse')
  const part = watch('part')
  const quantity = watch('quantity')
  const unitCost = watch('unitCost')

  const partOptions = useMemo(
    () => (warehouse ? allRows.filter((row) => row.warehouse_id === warehouse.id) : []),
    [allRows, warehouse],
  )

  function selectWarehouse(next: Warehouse | null) {
    setValue('warehouse', next, { shouldValidate: true })
    setValue('part', null)
    setValue('unitCost', '')
    setPartQuery('')
  }

  const onHand = part?.on_hand ?? 0
  const quantityIsInt = /^\d+$/.test(quantity)
  const exceedsStock = part !== null && quantityIsInt && Number(quantity) > onHand
  const canSubmit =
    warehouse !== null &&
    part !== null &&
    quantityIsInt &&
    Number(quantity) > 0 &&
    !exceedsStock &&
    unitCost.trim() !== '' &&
    Number(unitCost) > 0

  async function onValid(values: AddStorePartForm) {
    setSaving(true)
    try {
      await addStorePartToAsset(recipientBarcode, values)
      toast.success('Part added.', { position: 'top-center' })
      onClose()
    } catch {
      // axios interceptor already surfaced the error toast
    }
    setSaving(false)
  }

  function onInvalid(formErrors: FieldErrors<AddStorePartForm>) {
    const message =
      formErrors.warehouse?.message ??
      formErrors.part?.message ??
      formErrors.quantity?.message ??
      formErrors.unitCost?.message ??
      'Please fix the highlighted fields'
    toast.error(message, { position: 'top-center' })
  }

  return (
    <>
      <form
        id="add-store-part-form"
        onSubmit={handleSubmit(onValid, onInvalid)}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 py-2"
      >
        <HorizontalField label="Warehouse" required>
          <WarehouseChips selected={warehouse} onSelect={selectWarehouse} />
        </HorizontalField>

        <HorizontalField label="Part" required>
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
                    setValue(
                      'unitCost',
                      value.last_purchase_unit_cost === null
                        ? '0'
                        : String(value.last_purchase_unit_cost),
                      { shouldValidate: true },
                    )
                    setPartQuery('')
                  }}
                  onClear={() => {
                    field.onChange(null)
                    setPartQuery('')
                  }}
                  options={partOptions}
                  getLabel={(p) => p.part_number}
                  placeholder={warehouse ? 'Search part number' : 'Select a warehouse first'}
                  clearLabel="Clear part"
                  error={fieldState.invalid}
                  disabled={!warehouse}
                />
                {part && (
                  <span className="text-xs text-muted-foreground">
                    {part.description} · {onHand} in stock
                  </span>
                )}
              </div>
            )}
          />
        </HorizontalField>

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
                  placeholder="1"
                  className="max-w-[160px] tabular-nums"
                />
              )}
            />
            {exceedsStock && (
              <span className="text-xs text-destructive">Only {onHand} in stock</span>
            )}
          </div>
        </HorizontalField>

        <HorizontalField label="Unit cost" required>
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
      </form>

      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" form="add-store-part-form" disabled={saving || !canSubmit}>
          {saving ? (
            <>
              <CircleNotchIcon className="animate-spin" />
              Adding…
            </>
          ) : (
            'Add Part'
          )}
        </Button>
      </DialogFooter>
    </>
  )
}

function WarehouseChips({
  selected,
  onSelect,
}: {
  selected: Warehouse | null
  onSelect: (w: Warehouse | null) => void
}) {
  const activeWarehouses = useActiveWarehouses()

  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Select warehouse">
      {activeWarehouses.map((w) => (
        <Toggle
          key={w.id}
          variant="outline"
          pressed={selected?.id === w.id}
          onPressedChange={(pressed) => onSelect(pressed ? w : null)}
          aria-label={`Warehouse ${w.city_code}`}
        >
          {w.city_code}
        </Toggle>
      ))}
    </div>
  )
}
