import { PageContent } from '@/components/app-layout/page-content'
import { BidFormFields } from '@/components/bid/bid-form-fields'
import { StickyEditPageHeader } from '@/components/collections/sticky-edit-page-header'
import { FieldLegend, FieldSet } from '@/components/shadcn/field'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { BidFormSchema, type BidForm } from '@/ui-types/bid-form-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'

const EMPTY_BID_FORM: BidForm = { vendor: null, received_date: null, due_date: null, notes: '' }

interface BidFormPageProps {
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: BidForm) => Promise<void>
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
  const { isSubmitting, isDirty, isValid } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })

  function submitBid() {
    form.handleSubmit(onValidSubmit, onInvalidBid)()
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
        canSave={isValid}
        submittingText={pageConfig.submittingText}
        saveButtonText={pageConfig.saveButtonText}
        onSave={submitBid}
      />
      <PageContent className="flex flex-col gap-2">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="border rounded-md p-2 flex flex-col gap-2"
        >
          <fieldset disabled={isSubmitting} className="contents">
            <FieldSet>
              <FieldLegend>General Bid Information</FieldLegend>
              <BidFormFields control={form.control} />
            </FieldSet>
          </fieldset>
        </form>
        <UnsavedChangesDialog
          open={guard.isBlocked}
          onOpenChange={guard.onOpenChange}
          onDiscard={guard.onDiscard}
        />
      </PageContent>
    </>
  )
}
