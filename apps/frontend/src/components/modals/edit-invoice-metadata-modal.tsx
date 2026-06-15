import { useOrgStore } from '@/data/store/org-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { InvoiceMetadataFormSchema, type InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import { getSelectOption } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import type { InvoiceDetail } from 'shared-types'
import { flattenFieldErrors } from '@/lib/utils'
import { ControlledSearchSelectInput } from '../custom/controlled-search-select-input'
import { SelectOptions } from '../custom/select-options'
import { Button } from '../shadcn/button'
import { Checkbox } from '../shadcn/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Input } from '../shadcn/input'

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
  const orgs = useOrgStore(state => state.organizations)
  const invoiceTypes = useReferenceDataStore(state => state.invoiceTypes)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<InvoiceMetadataForm>({
    resolver: zodResolver(InvoiceMetadataFormSchema),
    defaultValues: toFormValues(invoice)
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(invoice))
  }, [open, invoice])

  async function onValid(values: InvoiceMetadataForm) {
    setIsSubmitting(true)
    try {
      await onSave(values)
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
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => e.preventDefault()}>
          <FieldGroup className='grid grid-cols-2 gap-x-6 gap-y-3'>
            <Field>
              <FieldLabel>Invoice Number</FieldLabel>
              <Input value={invoice.invoice_number} disabled readOnly />
            </Field>
            <ControlledSearchSelectInput
              control={form.control}
              name='organization'
              options={orgs}
              getLabel={o => o.name}
              fieldLabel='Organization'
              fieldRequired={true}
            />
            <Controller
              control={form.control}
              name='invoice_type'
              render={({ field: { onChange, value }, fieldState }) => (
                <SelectOptions
                  selection={value}
                  onSelectionChange={onChange}
                  options={invoiceTypes}
                  getLabel={t => t.type}
                  fieldLabel='Invoice Type'
                  anyAllowed={false}
                  fieldRequired={true}
                  error={fieldState.invalid}
                />
              )}
            />
            <Controller
              control={form.control}
              name='is_cleared'
              render={({ field }) => (
                <Field orientation='horizontal' className='w-fit items-center gap-2 self-end pb-2'>
                  <Checkbox
                    id='is_cleared'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor='is_cleared'>Cleared</FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} type='button' disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={submit} type='button' disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toFormValues(i: InvoiceDetail): InvoiceMetadataForm {
  return {
    organization: { id: i.customer.id, account_number: i.customer.account_number, name: i.customer.name },
    invoice_type: getSelectOption(i.invoice_type),
    is_cleared: i.is_cleared
  }
}
