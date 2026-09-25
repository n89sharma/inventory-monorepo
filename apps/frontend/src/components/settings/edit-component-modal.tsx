import {
  ComponentBrandSelect,
  ComponentFormFields,
  LockedComponentBrand,
} from '@/components/settings/component-form-fields'
import { useComponentMutations } from '@/hooks/use-component-mutations'
import { useBrands } from '@/hooks/use-reference-data'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { flattenFieldErrors } from '@/lib/utils'
import {
  ComponentFormSchema,
  toComponentFormValues,
  type ComponentForm,
} from '@/ui-types/component-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type Control, type FieldErrors } from 'react-hook-form'
import type { ComponentSummary } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface EditComponentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  component: ComponentSummary
}

export function EditComponentModal({
  open,
  onOpenChange,
  component,
}: EditComponentModalProps): React.JSX.Element {
  const { updateComponent } = useComponentMutations()
  const brands = useBrands()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo(() => toComponentFormValues(component, brands), [component, brands])
  const form = useForm<ComponentForm>({ resolver: zodResolver(ComponentFormSchema), values })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValidSubmit(data: ComponentForm) {
    setIsSubmitting(true)
    try {
      await updateComponent(component.id, data)
      form.reset(data)
      toast.success('Component updated', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ComponentForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Component</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <ComponentFormFields control={form.control}>
            <EditComponentBrand component={component} control={form.control} />
          </ComponentFormFields>
        </form>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => form.handleSubmit(onValidSubmit, onInvalidSubmit)()}
            type="button"
            disabled={isSubmitting}
          >
            Save Component
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

function EditComponentBrand({
  component,
  control,
}: {
  component: ComponentSummary
  control: Control<ComponentForm>
}): React.JSX.Element {
  if (component.asset_count > 0) {
    const assetNoun = component.asset_count === 1 ? 'asset' : 'assets'
    return (
      <LockedComponentBrand
        brandName={component.brand_name}
        reason={`Fitted to ${component.asset_count} ${assetNoun}, so the brand can't change.`}
      />
    )
  }
  return <ComponentBrandSelect control={control} />
}
