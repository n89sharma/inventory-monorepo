import { BidFormFields } from '@/components/bid/bid-form-fields'
import { BidSheetPasteFields, BidSheetPasteStatus } from '@/components/bid/bid-sheet-paste-fields'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useBidMutations } from '@/hooks/use-bid-mutations'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard'
import { parseBidPaste } from '@/lib/bid-paste'
import { DISCARD_USER_EDITS } from '@/lib/form-reset-options'
import { showEntityCreatedToast } from '@/lib/success-toast'
import { flattenFieldErrors } from '@/lib/utils'
import { BidFormSchema, type BidForm } from '@/ui-types/bid-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { DEFAULT_BID_MARGIN_PERCENT, DEFAULT_BID_TRANSPORT_COST } from 'shared-types'
import { toast } from 'sonner'

const EMPTY_BID_FORM: BidForm = {
  vendor: null,
  received_date: null,
  due_date: null,
  margin_percent: String(DEFAULT_BID_MARGIN_PERCENT),
  transport_cost: String(DEFAULT_BID_TRANSPORT_COST),
  notes: '',
}

type CreateBidStep = 'details' | 'sheet'

const STEP_DIALOG_CLASS = {
  details: 'sm:max-w-lg',
  sheet: 'sm:max-w-4xl',
} as const satisfies Record<CreateBidStep, string>

const STEP_DESCRIPTION = {
  details: 'Step 1 of 2: bid details.',
  sheet:
    "Step 2 of 2: paste the rows from the vendor's spreadsheet. Optional, you can also upload them later from the bid.",
} as const satisfies Record<CreateBidStep, string>

interface CreateBidModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (bidNumber: string) => void
}

export function CreateBidModal({
  open,
  onOpenChange,
  onCreated,
}: CreateBidModalProps): React.JSX.Element {
  const mutations = useBidMutations()
  const form = useForm<BidForm>({
    resolver: zodResolver(BidFormSchema),
    defaultValues: EMPTY_BID_FORM,
  })
  const [step, setStep] = useState<CreateBidStep>('details')
  const [sheetText, setSheetText] = useState('')
  const [firstRowIsHeaders, setFirstRowIsHeaders] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sheetResult = useMemo(
    () => (sheetText.trim() === '' ? null : parseBidPaste(sheetText, firstRowIsHeaders)),
    [sheetText, firstRowIsHeaders],
  )
  const sheetValid = sheetResult === null || sheetResult.ok

  function resetAll() {
    form.reset(undefined, DISCARD_USER_EDITS)
    setStep('details')
    setSheetText('')
    setFirstRowIsHeaders(true)
  }

  const guard = useUnsavedChangesGuard(
    form.formState.isDirty || sheetText !== '',
    onOpenChange,
    resetAll,
  )

  function onInvalid(errors: FieldErrors<BidForm>) {
    toast.error(flattenFieldErrors(errors, []), { position: 'top-center' })
  }

  function goToSheet() {
    form.handleSubmit(() => setStep('sheet'), onInvalid)()
  }

  async function submit() {
    if (sheetResult !== null && !sheetResult.ok) return
    setIsSubmitting(true)
    try {
      const { bidNumber } = await mutations.create(form.getValues(), sheetResult?.upload ?? null)
      showEntityCreatedToast({ entity: 'bid', id: bidNumber })
      resetAll()
      onOpenChange(false)
      onCreated(bidNumber)
    } catch {
      // interceptor surfaced the error toast — keep the dialog open
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isSubmitting ? undefined : guard.onOpenChange}>
      <DialogContent className={STEP_DIALOG_CLASS[step]}>
        <DialogHeader>
          <DialogTitle>New Bid</DialogTitle>
          <DialogDescription>{STEP_DESCRIPTION[step]}</DialogDescription>
        </DialogHeader>
        {step === 'details' && (
          <>
            <form onSubmit={(e) => e.preventDefault()}>
              <BidFormFields control={form.control} />
            </form>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => guard.onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={goToSheet}>
                Add Data
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 'sheet' && (
          <>
            <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-3">
              <BidSheetPasteFields
                text={sheetText}
                onTextChange={setSheetText}
                firstRowIsHeaders={firstRowIsHeaders}
                onFirstRowIsHeadersChange={setFirstRowIsHeaders}
              />
              {sheetResult !== null && <BidSheetPasteStatus result={sheetResult} />}
            </fieldset>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setStep('details')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="button" onClick={submit} disabled={isSubmitting || !sheetValid}>
                {isSubmitting ? 'Submitting…' : 'Submit'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
      <UnsavedChangesDialog
        open={guard.confirmOpen}
        onOpenChange={guard.setConfirmOpen}
        onDiscard={guard.discard}
      />
    </Dialog>
  )
}
