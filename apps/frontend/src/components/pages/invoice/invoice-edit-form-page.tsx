import { AddAssetByBarcode } from '@/components/custom/add-assets-to-create-form'
import { StickyEditPageHeader } from '@/components/custom/sticky-edit-page-header'
import { PageContent } from '@/components/layout/page-content'
import { UnsavedChangesDialog } from '@/components/custom/unsaved-changes-dialog'
import { Checkbox } from '@/components/shadcn/checkbox'
import { DataTable } from '@/components/shadcn/data-table'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/shadcn/field'
import { useNavigationGuard } from '@/hooks/use-navigation-guard'
import { flattenFieldErrors } from '@/lib/utils'
import { InvoiceEditFormSchema, type InvoiceEditForm } from '@/ui-types/invoice-form-types'
import type { AssetSummary } from 'shared-types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useFieldArray, useForm, type FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import { getFormAssetColumns } from '../column-defs/form-asset-columns'

interface InvoiceEditFormPageProps {
  defaultValues: InvoiceEditForm
  pageConfig: {
    pageHeading: string
    saveButtonText: string
    submittingText: string
    cancelNavUrl: string
  }
  breadcrumbs: { label: string; href?: string }[]
  onValidSubmit: (data: InvoiceEditForm) => Promise<void>
}

function validateInvoiceAsset(asset: AssetSummary): string | null {
  if (asset.purchase_invoice_id != null) return `${asset.barcode} is already linked to another invoice`
  return null
}

export function InvoiceEditFormPage({ defaultValues, pageConfig, breadcrumbs, onValidSubmit }: InvoiceEditFormPageProps): React.JSX.Element {
  const form = useForm<InvoiceEditForm>({
    resolver: zodResolver(InvoiceEditFormSchema),
    defaultValues
  })
  const { fields: assets, append: addAsset, remove: deleteAsset } = useFieldArray({ control: form.control, name: 'assets' })
  const { isSubmitting, isDirty } = form.formState
  const guard = useNavigationGuard({ isDirty: isDirty && !isSubmitting })
  const assetTableColumns = useMemo(() => getFormAssetColumns(deleteAsset), [deleteAsset])

  function submitInvoice() {
    form.handleSubmit(onValidSubmit, onInvalidInvoice)()
  }

  function onInvalidInvoice(errors: FieldErrors<InvoiceEditForm>) {
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
        submittingText={pageConfig.submittingText}
        saveButtonText={pageConfig.saveButtonText}
        onSave={submitInvoice}
      />
      <PageContent className='flex flex-col gap-2'>
      <form onSubmit={e => e.preventDefault()} className='border rounded-md p-2 flex flex-col gap-2'>
        <fieldset disabled={isSubmitting} className='contents'>
          <FieldSet>
            <FieldLegend>Invoice Information</FieldLegend>
            <FieldGroup className='grid grid-cols-3 gap-x-6 gap-y-3 max-w-4xl'>

              <Field className='max-w-60'>
                <FieldLabel>Invoice Number</FieldLabel>
                <p className='py-2'>{defaultValues.invoice_number}</p>
              </Field>

              <Field className='max-w-60'>
                <FieldLabel>Organization</FieldLabel>
                <p className='py-2'>{defaultValues.organization.name}</p>
              </Field>

              <Field className='max-w-60'>
                <FieldLabel>Invoice Type</FieldLabel>
                <p className='py-2'>{defaultValues.invoice_type.type}</p>
              </Field>

            </FieldGroup>

            <Controller
              control={form.control}
              name='is_cleared'
              render={({ field }) => (
                <Field orientation='horizontal' className='w-fit items-center gap-2'>
                  <Checkbox
                    id='is_cleared'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <FieldLabel htmlFor='is_cleared'>Cleared</FieldLabel>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name='assets'
              render={({ fieldState }) => (
                <div aria-live='polite'>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </div>
              )}
            />
          </FieldSet>
        </fieldset>
      </form>

      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>Assets</h2>
        </div>
        <AddAssetByBarcode
          getAssets={() => form.getValues('assets')}
          onAddAsset={addAsset}
          entityName='invoice'
          validateAsset={validateInvoiceAsset}
          disabled={isSubmitting}
          className='max-w-xl'
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
