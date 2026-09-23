import type { WarehouseTransferCostRow } from '@/components/settings/transfer-cost-table-columns'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { PriceField } from '@/components/shared/price-field'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { updateWarehouseTransferCost } from '@/data/api/transfer-cost-api'
import { invalidateWarehouseTransferCosts } from '@/hooks/use-transfer-costs'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { COST_FIELD_LABELS, TESTED_PROCESSING_COST_LABEL } from '@/lib/cost-fields'
import { flattenFieldErrors } from '@/lib/utils'
import {
  TransferCostFormSchema,
  toTransferCostForm,
  toTransferCosts,
  type TransferCostForm,
} from '@/ui-types/transfer-cost-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'

interface EditTransferCostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: WarehouseTransferCostRow
}

export function EditTransferCostModal({
  open,
  onOpenChange,
  row,
}: EditTransferCostModalProps): React.JSX.Element {
  const values = useMemo(() => toTransferCostForm(row), [row])
  const form = useForm<TransferCostForm>({ resolver: zodResolver(TransferCostFormSchema), values })
  const isSubmitting = form.formState.isSubmitting

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValidSubmit(data: TransferCostForm) {
    try {
      await updateWarehouseTransferCost(row.warehouse.id, toTransferCosts(data))
      await invalidateWarehouseTransferCosts()
      form.reset(data)
      toast.success('Transfer costs updated', { position: 'top-center' })
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    }
  }

  function onInvalidSubmit(errors: FieldErrors<TransferCostForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit(onValidSubmit, onInvalidSubmit)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Costs — {row.warehouse_label}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          These amounts are applied to each machine on a transfer dispatched from this warehouse.
          The tested amount is added on top for machines that are no longer untested.
        </p>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
          <PriceField
            control={form.control}
            name="transfer_cost"
            label={COST_FIELD_LABELS.transfer_cost}
          />
          <PriceField
            control={form.control}
            name="processing_cost"
            label={COST_FIELD_LABELS.processing_cost}
          />
          <PriceField
            control={form.control}
            name="tested_processing_cost"
            label={TESTED_PROCESSING_COST_LABEL}
          />
          <PriceField
            control={form.control}
            name="other_cost"
            label={COST_FIELD_LABELS.other_cost}
          />
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={submitForm} type="button" disabled={isSubmitting}>
            Save Transfer Costs
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
