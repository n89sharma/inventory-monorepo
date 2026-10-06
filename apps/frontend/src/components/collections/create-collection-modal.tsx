import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { DISCARD_USER_EDITS } from '@/lib/form-reset-options'
import { flattenFieldErrors } from '@/lib/utils'
import { useState } from 'react'
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface CreateCollectionModalProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  form: UseFormReturn<T>
  assetCount: number
  onCreate: (values: T) => Promise<string>
  onCreated: (collectionNumber: string) => void
  children: React.ReactNode
}

export function CreateCollectionModal<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  form,
  assetCount,
  onCreate,
  onCreated,
  children,
}: CreateCollectionModalProps<T>): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () =>
    form.reset(undefined, DISCARD_USER_EDITS),
  )

  async function onValid(values: T) {
    setIsSubmitting(true)
    try {
      const collectionNumber = await onCreate(values)
      form.reset(undefined, DISCARD_USER_EDITS)
      onOpenChange(false)
      onCreated(collectionNumber)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalid(errors: FieldErrors<T>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {assetCount > 0 && (
          <p className="rounded-md border px-3 py-2">
            {assetCount} selected asset{assetCount !== 1 ? 's' : ''} will be added
          </p>
        )}
        <form onSubmit={(e) => e.preventDefault()}>{children}</form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => guard.onOpenChange(false)}
            type="button"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={submit} type="button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create'}
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
