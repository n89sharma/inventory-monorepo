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
import { COST_FIELD_LABELS, TESTED_PROCESSING_COST_LABEL } from '@/lib/cost-fields'
import { formatDate, formatUSDWithSymbol } from '@/lib/formatters'
import { flattenFieldErrors } from '@/lib/utils'
import {
  TransferCostFormSchema,
  toTransferCostForm,
  toTransferCosts,
  type TransferCostForm,
} from '@/ui-types/transfer-cost-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { isSameDay, startOfDay } from 'date-fns'
import { useState } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import type { TransferCosts } from 'shared-types'
import { toast } from 'sonner'

interface DepartTransferModalProps {
  originId: number
  assetCount: number
  testedCount: number
  transferDate: Date | null
  disabled?: boolean
  onDepart: (costs: TransferCosts | null) => Promise<void>
}

function amountOf(value: string | undefined): number {
  return parseFloat(value ?? '') || 0
}

interface DepartCostFormProps {
  defaultCosts: TransferCosts
  assetCount: number
  testedCount: number
  onConfirm: (costs: TransferCosts) => Promise<void>
  onCancel: () => void
}

function DepartCostForm({
  defaultCosts,
  assetCount,
  testedCount,
  onConfirm,
  onCancel,
}: DepartCostFormProps): React.JSX.Element {
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
  const total = perMachine * assetCount + amountOf(watched.tested_processing_cost) * testedCount

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
        <PriceField
          control={form.control}
          name="tested_processing_cost"
          label={TESTED_PROCESSING_COST_LABEL}
        />
        <PriceField control={form.control} name="other_cost" label={COST_FIELD_LABELS.other_cost} />
      </form>
      <p className="text-muted-foreground text-sm">
        {testedCount} of {assetCount} machines are tested. Adds {formatUSDWithSymbol(total)} across{' '}
        {assetCount} machines.
      </p>
      <DialogFooter>
        <Button onClick={submitForm} disabled={isSubmitting} type="button">
          {isSubmitting && <SpinnerGapIcon className="animate-spin" />}
          Depart
        </Button>
        <Button variant="outline" onClick={onCancel} type="button" disabled={isSubmitting}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}

// The defaults have to be loaded before the form mounts, so they can seed defaultValues.
export function DepartTransferModal({
  originId,
  assetCount,
  testedCount,
  transferDate,
  disabled,
  onDepart,
}: DepartTransferModalProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const transferCosts = useWarehouseTransferCosts()
  const today = startOfDay(new Date())
  const dateWillChange = transferDate !== null && !isSameDay(transferDate, today)

  async function handleConfirm(costs: TransferCosts) {
    await onDepart(costs)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Depart</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Depart this transfer?</DialogTitle>
          <DialogDescription>
            All assets in the transfer will be marked as being in transit
          </DialogDescription>
        </DialogHeader>
        {dateWillChange && (
          <p className="text-muted-foreground text-sm">
            Transfer date will change from {formatDate(transferDate)} to {formatDate(today)}
          </p>
        )}
        {transferCosts && (
          <DepartCostForm
            defaultCosts={warehouseCostsOf(transferCosts, originId)}
            assetCount={assetCount}
            testedCount={testedCount}
            onConfirm={handleConfirm}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
