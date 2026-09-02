import { ModelFormFields } from '@/components/settings/model-form-fields'
import { toModelFormValues } from '@/ui-types/model-form-types'
import { useModelMutations } from '@/hooks/use-model-mutations'
import { useAssetTypes, useBrands } from '@/hooks/use-reference-data'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { ModelFormSchema, type ModelForm } from '@/ui-types/model-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { ModelSummary } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface EditModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model: ModelSummary
}

export function EditModelModal({
  open,
  onOpenChange,
  model,
}: EditModelModalProps): React.JSX.Element {
  const { updateModel } = useModelMutations()
  const brands = useBrands()
  const assetTypes = useAssetTypes()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(
    () => toModelFormValues(model, brands, assetTypes),
    [model, brands, assetTypes],
  )
  const form = useForm<ModelForm>({ resolver: zodResolver(ModelFormSchema), values })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValidSubmit(data: ModelForm) {
    setIsSubmitting(true)
    try {
      await updateModel(model.id, data)
      form.reset(data)
      toast.success('Model updated', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ModelForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Model</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <ModelFormFields control={form.control} />
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={submitForm} type="button" disabled={isSubmitting}>
            Save Model
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
