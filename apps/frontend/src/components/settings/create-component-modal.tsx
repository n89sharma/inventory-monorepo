import {
  ComponentBrandSelect,
  ComponentFormFields,
} from '@/components/settings/component-form-fields'
import { useComponentMutations } from '@/hooks/use-component-mutations'
import { flattenFieldErrors } from '@/lib/utils'
import { ComponentFormSchema, type ComponentForm } from '@/ui-types/component-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'

interface CreateComponentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_VALUES: ComponentForm = { name: '', brand: null, is_active: true }

export function CreateComponentModal({
  open,
  onOpenChange,
}: CreateComponentModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Component</DialogTitle>
        </DialogHeader>
        <CreateComponentFormBody onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

function CreateComponentFormBody({
  onOpenChange,
}: Pick<CreateComponentModalProps, 'onOpenChange'>): React.JSX.Element {
  const { createComponent } = useComponentMutations()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ComponentForm>({
    resolver: zodResolver(ComponentFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  async function onValidSubmit(data: ComponentForm) {
    setIsSubmitting(true)
    try {
      await createComponent(data)
      toast.success('Component created', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ComponentForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <ComponentFormFields control={form.control}>
          <ComponentBrandSelect control={form.control} />
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
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
