import { useOrgStore } from '@/data/store/org-store'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { formatTitleCase } from '@/lib/formatters'
import { flattenFieldErrors } from '@/lib/utils'
import { InvoiceMetadataFormSchema, type InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { INVOICE_TYPE, type InvoiceDetail } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Checkbox } from '../shadcn/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Input } from '../shadcn/input'
import { Textarea } from '../shadcn/textarea'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface EditInvoiceMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceDetail
  onSave: (metadata: InvoiceMetadataForm) => Promise<void>
}

export function EditInvoiceMetadataModal({
  open,
  onOpenChange,
  invoice,
  onSave,
}: EditInvoiceMetadataModalProps): React.JSX.Element {
  const orgs = useOrgStore((state) => state.organizations)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toFormValues(invoice), [invoice])
  const form = useForm<InvoiceMetadataForm>({
    resolver: zodResolver(InvoiceMetadataFormSchema),
    values,
  })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValid(values: InvoiceMetadataForm) {
    setIsSubmitting(true)
    try {
      await onSave(values)
      form.reset(values)
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalid(errors: FieldErrors<InvoiceMetadataForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Field>
              <FieldLabel>Invoice Number</FieldLabel>
              <Input value={invoice.invoice_number} disabled readOnly />
            </Field>
            <Field>
              <FieldLabel>Invoice Reference</FieldLabel>
              <Input value={invoice.invoice_reference} disabled readOnly />
            </Field>
            <Field>
              <FieldLabel>Invoice Type</FieldLabel>
              <Input value={formatTitleCase(invoice.invoice_type.type)} disabled readOnly />
            </Field>
            <ControlledSearchSelectInput
              control={form.control}
              name="organization"
              options={orgs}
              getLabel={(o) => o.name}
              fieldLabel={invoice.invoice_type.type === INVOICE_TYPE.sales ? 'Customer' : 'Vendor'}
              fieldRequired={true}
            />
            <Controller
              control={form.control}
              name="is_cleared"
              render={({ field }) => (
                <Field orientation="horizontal" className="w-fit items-center gap-2 self-end pb-2">
                  <Checkbox
                    id="is_cleared"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor="is_cleared">Cleared</FieldLabel>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel>Comments</FieldLabel>
                  <Textarea placeholder="Invoice notes…" className="resize-none" {...field} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => guard.onOpenChange(false)}
            type="button"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} type="button" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
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

function toFormValues(i: InvoiceDetail): InvoiceMetadataForm {
  return {
    organization: {
      id: i.customer.id,
      account_number: i.customer.account_number,
      name: i.customer.name,
    },
    is_cleared: i.is_cleared,
    comment: i.notes ?? '',
  }
}
