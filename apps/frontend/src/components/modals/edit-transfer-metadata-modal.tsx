import { useOrgStore } from '@/data/store/org-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { TransferMetadataFormSchema, type TransferMetadataForm } from '@/ui-types/transfer-form-types'
import { getSelectOption } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import type { TransferDetail } from 'shared-types'
import { flattenFieldErrors } from '@/lib/utils'
import { ControlledPopoverSearch } from '../custom/controlled-popover-search'
import { SelectOptions } from '../custom/select-options'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'

interface EditTransferMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: TransferDetail
  onSave: (metadata: TransferMetadataForm) => Promise<void>
}

export function EditTransferMetadataModal({
  open,
  onOpenChange,
  transfer,
  onSave,
}: EditTransferMetadataModalProps): React.JSX.Element {
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])
  const orgs = useOrgStore(state => state.organizations)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TransferMetadataForm>({
    resolver: zodResolver(TransferMetadataFormSchema),
    defaultValues: toFormValues(transfer)
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(transfer))
  }, [open, transfer])

  async function onValid(values: TransferMetadataForm) {
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

  function onInvalid(errors: FieldErrors<TransferMetadataForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Edit Transfer</DialogTitle>
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
            <Controller
              control={form.control}
              name='destination'
              render={({ field: { onChange, value }, fieldState }) => (
                <SelectOptions
                  selection={value}
                  onSelectionChange={onChange}
                  options={activeWarehouses}
                  getLabel={w => w.city_code}
                  fieldLabel='Destination'
                  anyAllowed={false}
                  fieldRequired={true}
                  error={fieldState.invalid}
                />
              )}
            />
            <ControlledPopoverSearch
              control={form.control}
              name='transporter'
              options={orgs}
              searchKey='name'
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
                    placeholder='Transfer notes…'
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

function toFormValues(t: TransferDetail): TransferMetadataForm {
  return {
    origin: getSelectOption(t.origin),
    destination: getSelectOption(t.destination),
    transporter: { id: t.transporter.id, account_number: t.transporter.account_number, name: t.transporter.name },
    comment: t.notes ?? ''
  }
}
