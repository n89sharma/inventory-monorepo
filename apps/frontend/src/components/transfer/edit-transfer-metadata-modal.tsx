import { useOrgs } from '@/hooks/use-org'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { formatDateParam } from '@/lib/date-param'
import { flattenFieldErrors } from '@/lib/utils'
import { getSelectOption } from '@/ui-types/select-option-types'
import {
  TransferMetadataFormSchema,
  type TransferMetadataForm,
} from '@/ui-types/transfer-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { parseISO, startOfDay } from 'date-fns'
import { useMemo, useState } from 'react'
import { Controller, useForm, type FieldErrors } from 'react-hook-form'
import { TRANSFER_STATUS, type TransferDetail } from 'shared-types'
import { toast } from 'sonner'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'
import { Field, FieldGroup, FieldLabel } from '../shadcn/field'
import { Textarea } from '../shadcn/textarea'
import { ControlledDatePickerField } from '../shared/date-picker'
import { ControlledSearchSelectInput } from '../shared/search-select/controlled-search-select-input'
import { SelectOptions } from '../shared/search-select/select-options'
import { UnsavedChangesDialog } from '../shared/unsaved-changes-dialog'

interface EditTransferMetadataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: TransferDetail
  onSaveMetadata: (metadata: TransferMetadataForm) => Promise<void>
  onSaveNotes: (comment: string) => Promise<void>
  onSaveDate: (transferDate: string) => Promise<void>
}

export function EditTransferMetadataModal({
  open,
  onOpenChange,
  transfer,
  onSaveMetadata,
  onSaveNotes,
  onSaveDate,
}: EditTransferMetadataModalProps): React.JSX.Element {
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgs()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const today = startOfDay(new Date())
  const canEditMetadata = transfer.status === TRANSFER_STATUS.DRAFT
  const canEditDate = transfer.status === TRANSFER_STATUS.SCHEDULED

  const values = useMemo(() => toFormValues(transfer), [transfer])
  const form = useForm<TransferMetadataForm>({
    resolver: zodResolver(TransferMetadataFormSchema),
    values,
  })

  const guard = useUnsavedChangesGuard(form.formState.isDirty, onOpenChange, () => form.reset())

  async function onValid(values: TransferMetadataForm) {
    setIsSubmitting(true)
    try {
      const { dirtyFields } = form.formState
      const saves: Promise<void>[] = []
      if (canEditMetadata) {
        saves.push(onSaveMetadata(values))
      } else if (dirtyFields.comment) {
        saves.push(onSaveNotes(values.comment))
      }
      if (canEditDate && dirtyFields.transfer_date && values.transfer_date) {
        saves.push(onSaveDate(formatDateParam(values.transfer_date)))
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

  function onInvalid(errors: FieldErrors<TransferMetadataForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function submit() {
    form.handleSubmit(onValid, onInvalid)()
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Transfer</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()}>
          <FieldGroup className="grid grid-cols-2 gap-x-6 gap-y-3">
            <fieldset disabled={!canEditMetadata} className="contents">
              <Controller
                control={form.control}
                name="origin"
                render={({ field: { onChange, value }, fieldState }) => (
                  <SelectOptions
                    selection={value}
                    onSelectionChange={onChange}
                    options={activeWarehouses}
                    getLabel={(w) => w.city_code}
                    fieldLabel="Origin"
                    anyAllowed={false}
                    fieldRequired={true}
                    error={fieldState.invalid}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="destination"
                render={({ field: { onChange, value }, fieldState }) => (
                  <SelectOptions
                    selection={value}
                    onSelectionChange={onChange}
                    options={activeWarehouses}
                    getLabel={(w) => w.city_code}
                    fieldLabel="Destination"
                    anyAllowed={false}
                    fieldRequired={true}
                    error={fieldState.invalid}
                  />
                )}
              />
              <ControlledSearchSelectInput
                control={form.control}
                name="transporter"
                options={orgs}
                getLabel={(o) => o.name}
                fieldLabel="Transporter"
                fieldRequired={true}
              />
            </fieldset>
            <ControlledDatePickerField
              control={form.control}
              name="transfer_date"
              label="Transfer Date"
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

function toFormValues(t: TransferDetail): TransferMetadataForm {
  return {
    origin: getSelectOption(t.origin),
    destination: getSelectOption(t.destination),
    transporter: {
      id: t.transporter.id,
      account_number: t.transporter.account_number,
      name: t.transporter.name,
    },
    comment: t.notes ?? '',
    transfer_date: t.transfer_date === null ? null : parseISO(t.transfer_date),
  }
}
