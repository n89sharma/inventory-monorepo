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
import { ScheduleDateFormSchema, type ScheduleDateForm } from '@/ui-types/schedule-date-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { SpinnerGapIcon } from '@phosphor-icons/react'
import { startOfDay } from 'date-fns'
import { useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'

interface ScheduleDateModalProps {
  title: string
  description: string
  dateLabel: string
  triggerLabel: string
  disabled: boolean
  onSchedule: (scheduledDate: string) => Promise<void>
}

export function ScheduleDateModal({
  title,
  description,
  dateLabel,
  triggerLabel,
  disabled,
  onSchedule,
}: ScheduleDateModalProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const today = startOfDay(new Date())
  const form = useForm<ScheduleDateForm>({
    resolver: zodResolver(ScheduleDateFormSchema),
    defaultValues: { scheduled_date: today },
  })
  const isSubmitting = form.formState.isSubmitting

  async function onValid(values: ScheduleDateForm) {
    await onSchedule(formatDateParam(values.scheduled_date))
    setOpen(false)
  }

  function onInvalid(errors: FieldErrors<ScheduleDateForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <ControlledDatePickerField
            control={form.control}
            name="scheduled_date"
            label={dateLabel}
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
