import { createOrg, getOrgs } from '@/data/api/org-api'
import { useOrgStore } from '@/data/store/org-store'
import { flattenFieldErrors } from '@/lib/utils'
import { OrgFormSchema, type OrgForm } from '@/ui-types/org-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { ControlledInputWithClear } from '../custom/controlled-input-with-clear'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { FieldGroup } from '../shadcn/field'

interface CreateOrgModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrgModal({ open, onOpenChange }: CreateOrgModalProps): React.JSX.Element {
  const setOrganizations = useOrgStore(state => state.setOrganizations)

  const form = useForm<OrgForm>({
    resolver: zodResolver(OrgFormSchema),
    defaultValues: getDefaultValues()
  })

  useEffect(() => {
    if (open) form.reset(getDefaultValues())
  }, [open])

  function getDefaultValues(): OrgForm {
    return {
      account_number: '',
      name: '',
      contact_name: null,
      phone: null,
      mobile: null,
      primary_email: null,
      address: null,
      city: null,
      province: null,
      country: null
    }
  }

  async function onValidSubmit(data: OrgForm) {
    const result = await createOrg(data)
    if (result.success) {
      getOrgs().then(setOrganizations)
      toast.success('Organization created')
      onOpenChange(false)
    } else {
      toast.error(result.error.summary, { position: 'top-center' })
    }
  }

  function onInvalidSubmit(errors: FieldErrors<OrgForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => e.preventDefault()}>
          <FieldGroup className='grid grid-cols-2 gap-x-6 gap-y-3'>

            <ControlledInputWithClear
              control={form.control}
              name='account_number'
              fieldLabel='Account Number'
              fieldRequired={true}
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='name'
              fieldLabel='Name'
              fieldRequired={true}
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='contact_name'
              fieldLabel='Contact Name'
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='phone'
              fieldLabel='Phone'
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='mobile'
              fieldLabel='Mobile'
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='primary_email'
              fieldLabel='Email'
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='address'
              fieldLabel='Address'
              inputType='string'
              className='col-span-2'
            />

            <ControlledInputWithClear
              control={form.control}
              name='city'
              fieldLabel='City'
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='province'
              fieldLabel='Province'
              inputType='string'
            />

            <ControlledInputWithClear
              control={form.control}
              name='country'
              fieldLabel='Country'
              inputType='string'
            />

          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant='secondary' onClick={submitForm} type='button'>
            Save Organization
          </Button>
          <Button variant='outline' onClick={() => onOpenChange(false)} type='button'>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
