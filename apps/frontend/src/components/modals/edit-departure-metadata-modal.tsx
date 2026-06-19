import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { DepartureMetadataFormSchema, type DepartureMetadataForm } from '@/ui-types/departure-form-types'
import { getSelectOption } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import type { DepartureDetail } from 'shared-types'
import { flattenFieldErrors } from '@/lib/utils'
import { ControlledSearchSelectInput } from '../custom/controlled-search-select-input'
import { SelectOptions } from '../custom/select-options'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'

interface EditDepartureMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departure: DepartureDetail
  onSave: (metadata: DepartureMetadataForm) => Promise<void>
}

export function EditDepartureMetadataModal({
  open,
  onOpenChange,
  departure,
  onSave,
}: EditDepartureMetadataModalProps): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore(state => state.organizations)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<DepartureMetadataForm>({
    resolver: zodResolver(DepartureMetadataFormSchema),
    defaultValues: toFormValues(departure)
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(departure))
  }, [open, departure])

  async function onValid(values: DepartureMetadataForm) {
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

  function onInvalid(errors: FieldErrors<DepartureMetadataForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Edit Departure</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => e.preventDefault()}>
          <FieldGroup className='grid grid-cols-2 gap-x-6 gap-y-3'>
            <Controller
              control={form.control}
              name='origin'
              render={({ field: { onChange, value }, fieldState }) => (
                <SelectOptions
                  selection={value}
                  onSelectionChange={onChange}
                  options={activeWarehouses}
                  getLabel={w => w.city_code}
                  fieldLabel='Origin'
                  anyAllowed={false}
                  fieldRequired={true}
                  error={fieldState.invalid}
                />
              )}
            />
            <ControlledSearchSelectInput
              control={form.control}
              name='customer'
              options={orgs}
              getLabel={o => o.name}
              fieldLabel='Customer'
              fieldRequired={true}
            />
            <ControlledSearchSelectInput
              control={form.control}
              name='transporter'
              options={orgs}
              getLabel={o => o.name}
              fieldLabel='Transporter'
              fieldRequired={true}
            />
            <Controller
              control={form.control}
              name='comment'
              render={({ field }) => (
                <Field className='col-span-2'>
                  <FieldLabel>Comments</FieldLabel>
                  <Textarea
                    placeholder='Departure notes…'
                    className='resize-none'
                    {...field}
                  />
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

function toFormValues(d: DepartureDetail): DepartureMetadataForm {
  return {
    origin: getSelectOption(d.origin),
    customer: { id: d.customer.id, account_number: d.customer.account_number, name: d.customer.name },
    transporter: { id: d.transporter.id, account_number: d.transporter.account_number, name: d.transporter.name },
    comment: d.notes ?? ''
  }
}
