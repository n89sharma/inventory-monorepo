import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
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
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { CreatePartTransferSchema, type CreatePartTransfer } from 'shared-types'
import { toast } from 'sonner'

interface AddPartTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipientBarcode: string | null
}

export function AddPartTransferModal({ open, onOpenChange, recipientBarcode }: AddPartTransferModalProps) {
  const createPartTransfer = useAssetStore(state => state.createPartTransfer)

  const form = useForm<CreatePartTransfer>({
    resolver: zodResolver(CreatePartTransferSchema),
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

  async function handleSave(data: CreatePartTransfer) {
    if (data.donor_barcode === recipientBarcode) {
      form.setError('donor_barcode', { message: 'Donor and recipient cannot be the same asset' })
      return
    }

    const response = await createPartTransfer(recipientBarcode!, data)
    if (response.success) {
      toast.success('Part transfer recorded.')
      onOpenChange(false)
    } else {
      toast.error(response.error.summary)
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
            <FieldLabel>Recipient Asset</FieldLabel>
            <p className="text-sm">{recipientBarcode}</p>
          </Field>

          <Controller
            control={form.control}
            name="donor_barcode"
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel>Donor Asset</FieldLabel>
                <Input
                  {...field}
                  placeholder="Scan or enter donor barcode…"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

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
            name="is_exchange"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="is_exchange"
                />
                <label htmlFor="is_exchange" className="text-sm cursor-pointer">
                  Exchange (part swapped in both directions)
                </label>
              </div>
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
