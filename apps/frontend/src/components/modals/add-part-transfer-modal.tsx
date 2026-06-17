import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
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
import { Textarea } from '@/components/shadcn/textarea'
import { useAssetStore } from '@/data/store/asset-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRightIcon, ArrowsLeftRightIcon, XIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { CreateSalvagedPartSchema, type CreateSalvagedPart } from 'shared-types'
import { toast } from 'sonner'

interface AddPartTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientBarcode: string | null
}

export function AddPartTransferModal({ open, onOpenChange, recipientBarcode }: AddPartTransferModalProps) {
  const createPartTransfer = useAssetStore(state => state.createPartTransfer)

  const form = useForm<CreateSalvagedPart>({
    resolver: zodResolver(CreateSalvagedPartSchema),
    defaultValues: {
      donor_barcode: '',
      part: '',
      is_exchange: false,
      notes: ''
    }
  })

  const { isSubmitting } = form.formState

  useEffect(() => {
    if (open) form.reset()
  }, [open])

  if (!recipientBarcode) return null

  async function handleSave(data: CreateSalvagedPart) {
    if (data.donor_barcode === recipientBarcode) {
      form.setError('donor_barcode', { message: 'Donor and recipient cannot be the same asset' })
      return
    }

    try {
      await createPartTransfer(recipientBarcode!, data)
      toast.success('Part transfer recorded.')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Part Transfer</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="donor_barcode"
                render={({ field, fieldState }) => (
                  <div className="flex-1">
                    {field.value
                      ? (
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
                      )
                      : (
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
                <Textarea
                  {...field}
                  placeholder="Optional notes…"
                  className="resize-none"
                />
              </Field>
            )}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit(handleSave)}
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
