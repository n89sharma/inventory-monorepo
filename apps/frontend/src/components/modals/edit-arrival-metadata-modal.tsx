import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { ArrivalMetadataFormSchema, type ArrivalMetadataForm } from '@/ui-types/arrival-form-types'
import { UNSELECTED, getSelectOption } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import type { ArrivalDetail } from 'shared-types'
import { flattenFieldErrors } from '@/lib/utils'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { UnsavedChangesDialog } from '../custom/unsaved-changes-dialog'
import { ControlledSearchSelectInput } from '../custom/controlled-search-select-input'
import { SelectOptions } from '../custom/select-options'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'

interface EditArrivalMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  arrival: ArrivalDetail
  onSave: (metadata: ArrivalMetadataForm) => Promise<void>
}

export function EditArrivalMetadataModal({
  open,
  onOpenChange,
  arrival,
  onSave,
}: EditArrivalMetadataModalProps): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toFormValues(arrival), [arrival])
  const form = useForm<ArrivalMetadataForm>({
    resolver: zodResolver(ArrivalMetadataFormSchema),
    values,
  })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValid(values: ArrivalMetadataForm) {
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

  function onInvalid(errors: FieldErrors<ArrivalMetadataForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Arrival</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ControlledSearchSelectInput
              control={form.control}
              name="vendor"
              options={orgs}
              getLabel={(o) => o.name}
              fieldLabel="Vendor"
              fieldRequired={true}
            />
            <ControlledSearchSelectInput
              control={form.control}
              name="transporter"
              options={orgs}
              getLabel={(o) => o.name}
              fieldLabel="Transporter"
              fieldRequired={true}
            />
            <Controller
              control={form.control}
              name="warehouse"
              render={({ field: { onChange, value }, fieldState }) => (
                <SelectOptions
                  selection={value}
                  onSelectionChange={onChange}
                  options={activeWarehouses}
                  getLabel={(w) => w.city_code}
                  fieldLabel="Warehouse"
                  anyAllowed={false}
                  fieldRequired={true}
                  error={fieldState.invalid}
                />
              )}
            />
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel>Comments</FieldLabel>
                  <Textarea placeholder="Arrival notes…" className="resize-none" {...field} />
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

function toFormValues(a: ArrivalDetail): ArrivalMetadataForm {
  return {
    vendor: { id: a.vendor.id, account_number: a.vendor.account_number, name: a.vendor.name },
    transporter: {
      id: a.transporter.id,
      account_number: a.transporter.account_number,
      name: a.transporter.name,
    },
    warehouse: a.warehouse ? getSelectOption(a.warehouse) : UNSELECTED,
    comment: a.comment ?? '',
  }
}
