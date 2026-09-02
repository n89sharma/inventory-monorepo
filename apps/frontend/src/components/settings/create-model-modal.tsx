import { ModelFormFields } from '@/components/settings/model-form-fields'
import { useModelMutations } from '@/hooks/use-model-mutations'
import { flattenFieldErrors } from '@/lib/utils'
import { ModelFormSchema, type ModelForm } from '@/ui-types/model-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'

interface CreateModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getDefaultValues(): ModelForm {
  return {
    name: '',
    weight: 0,
    size: 0,
    brand: null,
    assetType: UNSELECTED,
    is_colour: false,
  }
}

export function CreateModelModal({ open, onOpenChange }: CreateModelModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Model</DialogTitle>
        </DialogHeader>
        <CreateModelFormBody onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

function CreateModelFormBody({
  onOpenChange,
}: Pick<CreateModelModalProps, 'onOpenChange'>): React.JSX.Element {
  const { createModel } = useModelMutations()

  const form = useForm<ModelForm>({
    resolver: zodResolver(ModelFormSchema),
    defaultValues: getDefaultValues(),
  })

  async function onValidSubmit(data: ModelForm) {
    try {
      await createModel(data)
      toast.success('Model created')
      onOpenChange(false)
    } catch {
      // interceptor already showed the error toast
    }
  }

  function onInvalidSubmit(errors: FieldErrors<ModelForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <ModelFormFields control={form.control} />
      </form>
      <DialogFooter>
        <Button variant="secondary" onClick={submitForm} type="button">
          Save Model
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}
