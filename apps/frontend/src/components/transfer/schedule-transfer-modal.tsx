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
import { ControlledDatePickerField } from '@/components/shared/date-picker'
import { formatDateParam } from '@/lib/date-param'
import { flattenFieldErrors } from '@/lib/utils'
import {
  TransferScheduleFormSchema,
  type TransferScheduleForm,
} from '@/ui-types/transfer-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { startOfDay } from 'date-fns'
import { useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'

interface ScheduleTransferModalProps {
  disabled?: boolean
  onSchedule: (transferDate: string) => Promise<void>
}

export function ScheduleTransferModal({
  disabled,
  onSchedule,
}: ScheduleTransferModalProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const today = startOfDay(new Date())
  const form = useForm<TransferScheduleForm>({
    resolver: zodResolver(TransferScheduleFormSchema),
    defaultValues: { transfer_date: today },
  })
  const isSubmitting = form.formState.isSubmitting

  async function onValid(values: TransferScheduleForm) {
    await onSchedule(formatDateParam(values.transfer_date))
    setOpen(false)
  }

  function onInvalid(errors: FieldErrors<TransferScheduleForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>Schedule</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule this transfer?</DialogTitle>
          <DialogDescription>Lock the transfer and queues it for loading</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <ControlledDatePickerField
            control={form.control}
            name="transfer_date"
            label="Transfer Date"
            disabled={{ before: today }}
            startMonth={today}
          />
        </form>
        <DialogFooter>
          <Button onClick={submit} disabled={isSubmitting} type="button">
            {isSubmitting && <SpinnerGapIcon className="animate-spin" />}
            Schedule
          </Button>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            type="button"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
