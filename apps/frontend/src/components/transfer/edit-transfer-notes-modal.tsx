import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { TransferNotesFormSchema, type TransferNotesForm } from '@/ui-types/transfer-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import type { TransferDetail } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface EditTransferNotesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: TransferDetail
  onSave: (comment: string) => Promise<void>
}

export function EditTransferNotesModal({
  open,
  onOpenChange,
  transfer,
  onSave,
}: EditTransferNotesModalProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const values = useMemo<TransferNotesForm>(() => ({ comment: transfer.notes ?? '' }), [transfer])
  const form = useForm<TransferNotesForm>({
    resolver: zodResolver(TransferNotesFormSchema),
    values,
  })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValid(values: TransferNotesForm) {
    setIsSubmitting(true)
    try {
      await onSave(values.comment)
      form.reset(values)
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalid(errors: FieldErrors<TransferNotesForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Notes</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <Field>
                  <FieldLabel>Comments</FieldLabel>
                  <Textarea placeholder="Transfer notes…" className="resize-none" {...field} />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
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
            {isSubmitting ? 'Saving…' : 'Save Changes'}
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
