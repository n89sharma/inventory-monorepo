import { OrgFormFields } from '@/components/settings/org-form-fields'
import { useOrgMutations } from '@/hooks/use-org-mutations'
import { flattenFieldErrors } from '@/lib/utils'
import { OrgFormSchema, type OrgForm } from '@/ui-types/org-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'

interface CreateOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getDefaultValues(): OrgForm {
  return {
    account_number: null,
    name: '',
    contact_name: null,
    phone: null,
    mobile: null,
    primary_email: null,
    address: null,
    city: null,
    province: null,
    country: null,
  }
}

export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <CreateOrgFormBody onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

function CreateOrgFormBody({
  onOpenChange,
}: Pick<CreateOrgModalProps, 'onOpenChange'>): React.JSX.Element {
  const { createOrg } = useOrgMutations()

  const form = useForm<OrgForm>({
    resolver: zodResolver(OrgFormSchema),
    defaultValues: getDefaultValues(),
  })

  async function onValidSubmit(data: OrgForm) {
    try {
      await createOrg(data)
      toast.success('Organization created')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  function onInvalidSubmit(errors: FieldErrors<OrgForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <OrgFormFields control={form.control} />
      </form>
      <DialogFooter>
        <Button variant="secondary" onClick={submitForm} type="button">
          Save Organization
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
