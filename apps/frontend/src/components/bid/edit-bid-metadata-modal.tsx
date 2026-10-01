import { BidFormFields } from '@/components/bid/bid-form-fields'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { BidFormSchema, type BidForm } from '@/ui-types/bid-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { parseISO } from 'date-fns'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import type { BidDetail } from 'shared-types'
import { toast } from 'sonner'

interface EditBidMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bid: BidDetail
  onSave: (metadata: BidForm) => Promise<void>
}

export function EditBidMetadataModal({
  open,
  onOpenChange,
  bid,
  onSave,
}: EditBidMetadataModalProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const values = useMemo(() => toFormValues(bid), [bid])
  const form = useForm<BidForm>({ resolver: zodResolver(BidFormSchema), values })
  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValid(newValues: BidForm) {
    setIsSubmitting(true)
    try {
      await onSave(newValues)
      form.reset(newValues)
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalid(errors: FieldErrors<BidForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Bid</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <BidFormFields control={form.control} />
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

function toFormValues(bid: BidDetail): BidForm {
  return {
    vendor: bid.vendor,
    received_date: parseISO(bid.received_date),
    due_date: parseISO(bid.due_date),
    margin_percent: String(bid.margin_percent),
    transport_cost: String(bid.transport_cost),
    notes: bid.notes ?? '',
  }
}
