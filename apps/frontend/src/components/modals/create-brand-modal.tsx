import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { flattenFieldErrors } from '@/lib/utils'
import { BrandFormSchema, type BrandForm } from '@/ui-types/brand-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { ControlledInputWithClear } from '../custom/controlled-input-with-clear'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { FieldGroup } from '../shadcn/field'

interface CreateBrandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBrandModal({ open, onOpenChange }: CreateBrandModalProps): React.JSX.Element {
  const createBrand = useReferenceDataStore((state) => state.createBrand)

  const form = useForm<BrandForm>({
    resolver: zodResolver(BrandFormSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (open) form.reset({ name: '' })
  }, [open, form])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Brand</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}
