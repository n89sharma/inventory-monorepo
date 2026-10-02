import { PageContent } from '@/components/app-layout/page-content'
import { BidFormFields } from '@/components/bid/bid-form-fields'
import { BidSheetPasteFields } from '@/components/bid/bid-sheet-paste-fields'
import { StickyEditPageHeader } from '@/components/collections/sticky-edit-page-header'
import { FieldDescription, FieldLegend, FieldSet } from '@/components/shadcn/field'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { parseBidPaste, type BidPasteResult } from '@/lib/bid-paste'
import { flattenFieldErrors } from '@/lib/utils'
import { BidFormSchema, type BidForm } from '@/ui-types/bid-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import {
  DEFAULT_BID_MARGIN_PERCENT,
  DEFAULT_BID_TRANSPORT_COST,
  type UploadBidRows,
} from 'shared-types'
import { toast } from 'sonner'

const EMPTY_BID_FORM: BidForm = {
  vendor: null,
  received_date: null,
  due_date: null,
  margin_percent: String(DEFAULT_BID_MARGIN_PERCENT),
  transport_cost: String(DEFAULT_BID_TRANSPORT_COST),
  notes: '',
}

interface BidFormPageProps {
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: BidForm, sheet: UploadBidRows | null) => Promise<void>
}

export function BidFormPage({
  pageConfig,
  breadcrumbs,
  onValidSubmit,
}: BidFormPageProps): React.JSX.Element {
  const form = useForm<BidForm>({
    resolver: zodResolver(BidFormSchema),
    mode: 'onChange',
    defaultValues: EMPTY_BID_FORM,
  })
  const [sheetText, setSheetText] = useState('')
  const [firstRowIsHeaders, setFirstRowIsHeaders] = useState(true)
  const sheetResult = useMemo(
    () => (sheetText.trim() === '' ? null : parseBidPaste(sheetText, firstRowIsHeaders)),
    [sheetText, firstRowIsHeaders],
  )
  const sheetValid = sheetResult === null || sheetResult.ok
  const { isSubmitting, isDirty, isValid } = form.formState
  const guard = useNavigationGuard({ isDirty: (isDirty || sheetText !== '') && !isSubmitting })

  function submitBid() {
    if (sheetResult !== null && !sheetResult.ok) return
    const sheet = sheetResult === null ? null : sheetResult.upload
    form.handleSubmit((data) => onValidSubmit(data, sheet), onInvalidBid)()
  }

  function onInvalidBid(errors: FieldErrors<BidForm>) {
    toast.error(`Form has errors: ${flattenFieldErrors(errors, [])}`, { position: 'top-center' })
  }

  return (
    <>
      <StickyEditPageHeader
        breadcrumbs={breadcrumbs}
        pageHeading={pageConfig.pageHeading}
        onNavigate={guard.guardedNavigate}
        cancelNavUrl={pageConfig.cancelNavUrl}
        isSubmitting={isSubmitting}
        isDirty={isDirty}
        canSave={isValid && sheetValid}
        submittingText={pageConfig.submittingText}
        saveButtonText={pageConfig.saveButtonText}
        onSave={submitBid}
      />
      <PageContent className="flex flex-col gap-2">
        <form onSubmit={(e) => e.preventDefault()} className="border rounded-md p-4 max-w-xl">
          <fieldset disabled={isSubmitting} className="contents">
            <BidFormFields control={form.control} />
          </fieldset>
        </form>
        <fieldset disabled={isSubmitting} className="border rounded-md p-4">
          <FieldSet className="gap-3">
            <FieldLegend className="mb-0">Vendor Sheet</FieldLegend>
            <FieldDescription>
              Optional. Paste the rows copied from the vendor's spreadsheet, or upload them later
              from the bid.
            </FieldDescription>
            <BidSheetPasteFields
              text={sheetText}
              onTextChange={setSheetText}
              firstRowIsHeaders={firstRowIsHeaders}
              onFirstRowIsHeadersChange={setFirstRowIsHeaders}
            />
            {sheetResult !== null && <SheetPasteStatus result={sheetResult} />}
          </FieldSet>
        </fieldset>
        <UnsavedChangesDialog
          open={guard.isBlocked}
          onOpenChange={guard.onOpenChange}
          onDiscard={guard.onDiscard}
        />
      </PageContent>
    </>
  )
}

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function SheetPasteStatus({ result }: { result: BidPasteResult }): React.JSX.Element {
  if (!result.ok) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {result.error}
      </p>
    )
  }
  return (
    <p className="text-muted-foreground text-sm">
      {countLabel(result.upload.rows.length, 'row')},{' '}
      {countLabel(result.upload.headers.length, 'column')}
    </p>
  )
}
