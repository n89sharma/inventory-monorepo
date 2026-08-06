import { useBrandMutations } from '@/hooks/use-brand-mutations'
import { flattenFieldErrors } from '@/lib/utils'
import { BrandFormSchema, type BrandForm } from '@/ui-types/brand-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { FieldGroup } from '../shadcn/field'
import { ControlledInputWithClear } from '@/components/settings/controlled-input-with-clear'

interface CreateBrandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBrandModal({ open, onOpenChange }: CreateBrandModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Brand</DialogTitle>
        </DialogHeader>
        <CreateBrandFormBody onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

function CreateBrandFormBody({
  onOpenChange,
}: Pick<CreateBrandModalProps, 'onOpenChange'>): React.JSX.Element {
  const { createBrand } = useBrandMutations()

  const form = useForm<BrandForm>({
    resolver: zodResolver(BrandFormSchema),
    defaultValues: { name: '' },
  })

  async function onValidSubmit(data: BrandForm) {
    try {
      await createBrand(data)
      toast.success('Brand created')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  function onInvalidSubmit(errors: FieldErrors<BrandForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <FieldGroup>
          <ControlledInputWithClear
            control={form.control}
            name="name"
            fieldLabel="Name"
            fieldRequired={true}
            inputType="string"
          />
        </FieldGroup>
      </form>
      <DialogFooter>
        <Button variant="secondary" onClick={submitForm} type="button">
          Save Brand
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
