import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog'
import { PriceField } from '@/components/shared/price-field'
import { useWarehouseTransferCosts, warehouseCostsOf } from '@/hooks/use-transfer-costs'
import { COST_FIELD_LABELS } from '@/lib/cost-fields'
import { formatUSDWithSymbol } from '@/lib/formatters'
import { flattenFieldErrors } from '@/lib/utils'
import {
  TransferCostFormSchema,
  toTransferCostForm,
  toTransferCosts,
  type TransferCostForm,
} from '@/ui-types/transfer-cost-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import type { TransferCosts } from 'shared-types'
import { toast } from 'sonner'

interface DispatchTransferModalProps {
  originId: number
  assetCount: number
  onDispatch: (costs: TransferCosts | null) => Promise<void>
}

function amountOf(value: string | undefined): number {
  return parseFloat(value ?? '') || 0
}

interface DispatchCostFormProps {
  defaultCosts: TransferCosts
  assetCount: number
  onConfirm: (costs: TransferCosts) => Promise<void>
  onCancel: () => void
}

function DispatchCostForm({
  defaultCosts,
  assetCount,
  onConfirm,
  onCancel,
}: DispatchCostFormProps): React.JSX.Element {
  const form = useForm<TransferCostForm>({
    resolver: zodResolver(TransferCostFormSchema),
    defaultValues: toTransferCostForm(defaultCosts),
  })
  const isSubmitting = form.formState.isSubmitting

  const watched = useWatch({ control: form.control })
  const perMachine =
    amountOf(watched.transfer_cost) +
    amountOf(watched.processing_cost) +
    amountOf(watched.other_cost)

  function onInvalidSubmit(errors: FieldErrors<TransferCostForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  function submitForm() {
    form.handleSubmit((data) => onConfirm(toTransferCosts(data)), onInvalidSubmit)()
  }

  return (
    <>
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
        <PriceField control={form.control} name="other_cost" label={COST_FIELD_LABELS.other_cost} />
      </form>
      <p className="text-muted-foreground text-sm">
        Each machine is charged {formatUSDWithSymbol(perMachine)}, adding{' '}
        {formatUSDWithSymbol(perMachine * assetCount)} across {assetCount} machines.
      </p>
      <DialogFooter>
        <Button onClick={submitForm} disabled={isSubmitting} type="button">
          {isSubmitting && <SpinnerGapIcon className="animate-spin" />}
          Dispatch
        </Button>
        <Button variant="outline" onClick={onCancel} type="button" disabled={isSubmitting}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}

// The defaults have to be loaded before the form mounts, so they can seed defaultValues.
export function DispatchTransferModal({
  originId,
  assetCount,
  onDispatch,
}: DispatchTransferModalProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const transferCosts = useWarehouseTransferCosts()

  async function handleConfirm(costs: TransferCosts) {
    await onDispatch(costs)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Dispatch</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dispatch this transfer?</DialogTitle>
          <DialogDescription>
            This marks {assetCount} machine(s) as in transit and clears their location. The transfer
            can&apos;t be edited after dispatch. These costs are added to each machine.
          </DialogDescription>
        </DialogHeader>
        {transferCosts && (
          <DispatchCostForm
            defaultCosts={warehouseCostsOf(transferCosts, originId)}
            assetCount={assetCount}
            onConfirm={handleConfirm}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
