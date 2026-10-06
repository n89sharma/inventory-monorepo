import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { formatDateParam } from '@/lib/date-param'
import { flattenFieldErrors } from '@/lib/utils'
import {
  DepartureMetadataFormSchema,
  type DepartureMetadataForm,
} from '@/ui-types/departure-form-types'
import { getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { parseISO, startOfDay } from 'date-fns'
import { useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { DEPARTURE_STATUS, type DepartureDetail } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { ControlledDatePickerField } from '../shared/date-picker'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'
import { DepartureMetadataFields } from './departure-metadata-fields'

interface EditDepartureMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  departure: DepartureDetail
  onSave: (metadata: DepartureMetadataForm) => Promise<void>
  onSaveNotes: (comment: string) => Promise<void>
  onSaveDate: (departureDate: string) => Promise<void>
}

export function EditDepartureMetadataModal({
  open,
  onOpenChange,
  departure,
  onSave,
  onSaveNotes,
  onSaveDate,
}: EditDepartureMetadataModalProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = startOfDay(new Date())
  const canEditMetadata = departure.status === DEPARTURE_STATUS.DRAFT
  const canEditDate = departure.status === DEPARTURE_STATUS.SCHEDULED

  const values = useMemo(() => toFormValues(departure), [departure])
  const form = useForm<DepartureMetadataForm>({
    resolver: zodResolver(DepartureMetadataFormSchema),
    values,
  })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValid(values: DepartureMetadataForm) {
    setIsSubmitting(true)
    try {
      const { dirtyFields } = form.formState
      const saves: Promise<void>[] = []
      if (canEditMetadata) {
        saves.push(onSave(values))
      } else if (dirtyFields.comment) {
        saves.push(onSaveNotes(values.comment))
      }
      if (canEditDate && dirtyFields.departure_date && values.departure_date) {
        saves.push(onSaveDate(formatDateParam(values.departure_date)))
      }
      await Promise.all(saves)
      form.reset(values)
      onOpenChange(false)
    } catch {
      // interceptor surfaced the error toast — keep modal open
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalid(errors: FieldErrors<DepartureMetadataForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Departure</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
            <fieldset disabled={!canEditMetadata} className="contents">
              <DepartureMetadataFields control={form.control} />
            </fieldset>
            <ControlledDatePickerField
              control={form.control}
              name="departure_date"
              label="Departure Date"
              className="self-end pb-0.5"
              disabled={{ before: today }}
              fieldDisabled={!canEditDate}
            />
            <Controller
              control={form.control}
              name="comment"
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel>Comments</FieldLabel>
                  <Textarea placeholder="Departure notes…" className="resize-none" {...field} />
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

function toFormValues(d: DepartureDetail): DepartureMetadataForm {
  return {
    origin: getSelectOption(d.origin),
    customer: {
      id: d.customer.id,
      account_number: d.customer.account_number,
      name: d.customer.name,
    },
    transporter: {
      id: d.transporter.id,
      account_number: d.transporter.account_number,
      name: d.transporter.name,
    },
    salesperson: d.salesperson ? getSelectOption(d.salesperson) : UNSELECTED,
    comment: d.notes ?? '',
    departure_date: d.departure_date === null ? null : parseISO(d.departure_date),
  }
}
