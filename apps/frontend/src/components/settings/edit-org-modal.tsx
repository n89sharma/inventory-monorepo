import { ControlledInputWithClear } from '@/components/settings/controlled-input-with-clear'
import { useOrgMutations } from '@/hooks/use-org-mutations'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { OrgFormSchema, type OrgForm } from '@/ui-types/org-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { OrgDetail } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { FieldGroup } from '../shadcn/field'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface EditOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  org: OrgDetail
}

function toFormValues(org: OrgDetail): OrgForm {
  return {
    account_number: org.account_number,
    name: org.name,
    contact_name: org.contact_name,
    phone: org.phone,
    mobile: org.mobile,
    primary_email: org.primary_email,
    address: org.address,
    city: org.city,
    province: org.province,
    country: org.country,
  }
}

export function EditOrgModal({ open, onOpenChange, org }: EditOrgModalProps): React.JSX.Element {
  const { updateOrg } = useOrgMutations()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toFormValues(org), [org])
  const form = useForm<OrgForm>({ resolver: zodResolver(OrgFormSchema), values })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValidSubmit(data: OrgForm) {
    setIsSubmitting(true)
    try {
      await updateOrg(org.id, data)
      form.reset(data)
      toast.success('Organization updated', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<OrgForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ControlledInputWithClear
              control={form.control}
              name="account_number"
              fieldLabel="Account Number"
              fieldRequired={true}
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="name"
              fieldLabel="Name"
              fieldRequired={true}
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="contact_name"
              fieldLabel="Contact Name"
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="phone"
              fieldLabel="Phone"
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="mobile"
              fieldLabel="Mobile"
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="primary_email"
              fieldLabel="Email"
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="address"
              fieldLabel="Address"
              inputType="string"
              className="col-span-2"
            />

            <ControlledInputWithClear
              control={form.control}
              name="city"
              fieldLabel="City"
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="province"
              fieldLabel="Province"
              inputType="string"
            />

            <ControlledInputWithClear
              control={form.control}
              name="country"
              fieldLabel="Country"
              inputType="string"
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={submitForm} type="button" disabled={isSubmitting}>
            Save Organization
          </Button>
          <Button variant="outline" onClick={() => guard.onOpenChange(false)} type="button">
            Cancel
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
