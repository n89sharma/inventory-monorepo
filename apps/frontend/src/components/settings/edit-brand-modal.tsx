import { ControlledInputWithClear } from '@/components/settings/controlled-input-with-clear'
import { useBrandMutations } from '@/hooks/use-brand-mutations'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { BrandFormSchema, type BrandForm } from '@/ui-types/brand-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { Brand } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { FieldGroup } from '../shadcn/field'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface EditBrandModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand: Brand
}

function toFormValues(brand: Brand): BrandForm {
  return { name: brand.name }
}

export function EditBrandModal({
  open,
  onOpenChange,
  brand,
}: EditBrandModalProps): React.JSX.Element {
  const { updateBrand } = useBrandMutations()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toFormValues(brand), [brand])
  const form = useForm<BrandForm>({ resolver: zodResolver(BrandFormSchema), values })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValidSubmit(data: BrandForm) {
    setIsSubmitting(true)
    try {
      await updateBrand(brand.id, data)
      form.reset(data)
      toast.success('Brand updated', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<BrandForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
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
          <Button variant="secondary" onClick={submitForm} type="button" disabled={isSubmitting}>
            Save Brand
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
