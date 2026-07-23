import { PageContent } from '@/components/app-layout/page-content'
import { getFormAssetColumns } from '@/components/table-columns/create-edit-collection-form-columns'
import { Checkbox } from '@/components/shadcn/checkbox'
import { DataTable } from '@/components/shadcn/data-table'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { Textarea } from '@/components/shadcn/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import { AddAssetsByBarcodeOrSerial } from '@/components/collections/add-assets-by-barcode-or-serial'
import { StickyEditPageHeader } from '@/components/collections/sticky-edit-page-header'
import { ControlledDatePickerField } from '@/components/shared/date-picker'
import { ControlledSearchSelectInput } from '@/components/shared/search-select/controlled-search-select-input'
import { UnsavedChangesDialog } from '@/components/shared/unsaved-changes-dialog'
import { useOrgStore } from '@/data/store/org-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { formatTitleCase } from '@/lib/formatters'
import { flattenFieldErrors } from '@/lib/utils'
import { InvoiceFormSchema, type InvoiceForm } from '@/ui-types/invoice-form-types'
import { getSelectedOrNull, getSelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { startOfDay } from 'date-fns'
import { useMemo } from 'react'
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
} from 'react-hook-form'
import { INVOICE_TYPE, type AssetSummary, type InvoiceType } from 'shared-types'
import { toast } from 'sonner'

interface InvoiceFormPageProps {
  defaultAssets?: AssetSummary[]
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: InvoiceForm) => Promise<void>
}

function validateInvoiceAsset(
  asset: AssetSummary,
  invoiceTypeName: string | undefined,
): string | null {
  const linkedInvoiceNumber =
    invoiceTypeName === INVOICE_TYPE.sales
      ? asset.sales_invoice_number
      : asset.purchase_invoice_number
  if (linkedInvoiceNumber != null) return `${asset.barcode} is already linked to another invoice`
  return null
}

export function InvoiceFormPage({
  defaultAssets,
  pageConfig,
  breadcrumbs,
  onValidSubmit,
}: InvoiceFormPageProps): React.JSX.Element {
  const orgs = useOrgStore((state) => state.organizations)
  const invoiceTypes = useReferenceDataStore((state) => state.invoiceTypes)
  const purchaseType = invoiceTypes.find((t) => t.type === INVOICE_TYPE.purchase)
  const today = startOfDay(new Date())

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(InvoiceFormSchema),
    mode: 'onChange',
    defaultValues: {
      invoice_reference: '',
      invoice_date: startOfDay(new Date()),
      organization: null,
      invoice_type: purchaseType ? getSelectOption(purchaseType) : UNSELECTED,
      is_cleared: false,
      comment: '',
      assets: defaultAssets ?? [],
    },
  })
  const {
    fields: assets,
    append: addAsset,
    remove: deleteAsset,
  } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting, isDirty, isValid } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })
  const assetTableColumns = useMemo(() => getFormAssetColumns(deleteAsset), [deleteAsset])

  const invoiceType = useWatch({ control: form.control, name: 'invoice_type' })
  const selectedInvoiceTypeName = getSelectedOrNull(invoiceType)?.type
  const orgFieldLabel = selectedInvoiceTypeName === INVOICE_TYPE.sales ? 'Customer' : 'Vendor'

  function submitInvoice() {
    form.handleSubmit(onValidSubmit, onInvalidInvoice)()
  }

  function onInvalidInvoice(errors: FieldErrors<InvoiceForm>) {
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
        onSave={submitInvoice}
      />
      <PageContent className="flex flex-col gap-2">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="border rounded-md p-2 flex flex-col gap-2"
        >
          <fieldset disabled={isSubmitting} className="contents">
            <FieldSet>
              <FieldLegend>Invoice Information</FieldLegend>
              <FieldGroup className="grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl">
                <InvoiceTypeToggleField control={form.control} invoiceTypes={invoiceTypes} />

                <Controller
                  control={form.control}
                  name="invoice_reference"
                  render={({ field, fieldState }) => (
                    <Field className="max-w-60">
                      <FieldLabel>
                        Invoice Reference
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        placeholder="e.g. INV-001"
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <ControlledDatePickerField
                  control={form.control}
                  name="invoice_date"
                  label="Invoice Date"
                  className="max-w-60"
                  disabled={{ after: today }}
                  endMonth={today}
                />

                <ControlledSearchSelectInput
                  control={form.control}
                  name="organization"
                  options={orgs}
                  getLabel={(o) => o.name}
                  fieldLabel={orgFieldLabel}
                  fieldRequired={true}
                  className="max-w-60"
                />
              </FieldGroup>

              <Controller
                control={form.control}
                name="is_cleared"
                render={({ field }) => (
                  <Field orientation="horizontal" className="w-fit items-center gap-2">
                    <Checkbox
                      id="is_cleared"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <FieldLabel htmlFor="is_cleared">Cleared</FieldLabel>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <Field className="max-w-xl">
                    <FieldLabel>Comments</FieldLabel>
                    <Textarea placeholder="Invoice notes…" className="resize-none" {...field} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="assets"
                render={({ fieldState }) => (
                  <div aria-live="polite">
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </div>
                )}
              />
            </FieldSet>
          </fieldset>
        </form>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assets</h2>
          </div>
          <AddAssetsByBarcodeOrSerial
            getAssets={() => form.getValues('assets')}
            onAddAsset={addAsset}
            entityName="invoice"
            validateAsset={(asset) => validateInvoiceAsset(asset, selectedInvoiceTypeName)}
            disabled={isSubmitting}
            className="max-w-xl"
          />
          <DataTable columns={assetTableColumns} data={assets} />
        </div>

        <UnsavedChangesDialog
          open={guard.isBlocked}
          onOpenChange={guard.onOpenChange}
          onDiscard={guard.onDiscard}
        />
      </PageContent>
    </>
  )
}

function InvoiceTypeToggleField({
  control,
  invoiceTypes,
}: {
  control: Control<InvoiceForm>
  invoiceTypes: InvoiceType[]
}): React.JSX.Element {
  return (
    <Controller
      control={control}
      name="invoice_type"
      render={({ field: { onChange, value }, fieldState }) => (
        <Field className="max-w-60">
          <FieldLabel>
            Invoice Type
            <span className="text-destructive">*</span>
          </FieldLabel>

          <ToggleGroup
            type="single"
            value={getSelectedOrNull(value) ? String(getSelectedOrNull(value)!.id) : ''}
            onValueChange={(next) => {
              if (!next) return
              const picked = invoiceTypes.find((t) => String(t.id) === next)
              if (picked) onChange(getSelectOption(picked))
            }}
            variant="outline"
            size="sm"
            aria-invalid={fieldState.invalid}
          >
            {invoiceTypes.map((t) => (
              <ToggleGroupItem key={t.id} value={String(t.id)}>
                {formatTitleCase(t.type)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
