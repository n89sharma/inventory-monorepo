import { useOrgStore } from '@/data/store/org-store'
import { useActiveUsers } from '@/hooks/use-active-users'
import { HoldMetadataFormSchema, type HoldMetadataForm } from '@/ui-types/hold-form-types'
import { getSelectOption } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import type { HoldDetail } from 'shared-types'
import { flattenFieldErrors } from '@/lib/utils'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { UnsavedChangesDialog } from '../custom/unsaved-changes-dialog'
import { ControlledSearchSelectInput } from '../custom/controlled-search-select-input'
import { ControlledSelectOptionSearchSelect } from '../custom/controlled-select-option-search-select'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'

interface EditHoldMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hold: HoldDetail
  onSave: (metadata: HoldMetadataForm) => Promise<void>
}

export function EditHoldMetadataModal({
  open,
  onOpenChange,
  hold,
  onSave,
}: EditHoldMetadataModalProps): React.JSX.Element {
  const activeUsers = useActiveUsers()
  const orgs = useOrgStore((state) => state.organizations)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toFormValues(hold), [hold])
  const form = useForm<HoldMetadataForm>({
    resolver: zodResolver(HoldMetadataFormSchema),
    values,
  })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValid(values: HoldMetadataForm) {
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

  function onInvalid(errors: FieldErrors<HoldMetadataForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Hold</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ControlledSelectOptionSearchSelect
              control={form.control}
              name="created_for"
              options={activeUsers}
              getLabel={(u) => u.name}
              fieldLabel="Created For"
              fieldRequired={true}
            />
            <ControlledSearchSelectInput
              control={form.control}
              name="customer"
              options={orgs}
              getLabel={(o) => o.name}
              fieldLabel="Customer"
              fieldRequired={true}
            />
            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel>Notes</FieldLabel>
                  <Textarea placeholder="Hold notes…" className="resize-none" {...field} />
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

function toFormValues(h: HoldDetail): HoldMetadataForm {
  return {
    created_for: getSelectOption(h.created_for),
    customer: {
      id: h.customer.id,
      account_number: h.customer.account_number,
      name: h.customer.name,
    },
    notes: h.notes ?? '',
  }
}
